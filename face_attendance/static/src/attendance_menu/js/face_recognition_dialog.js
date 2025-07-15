/** @odoo-module **/

import {Component, onMounted, onWillUnmount, useRef} from "@odoo/owl";
import {Dialog} from "@web/core/dialog/dialog";
import {useService} from "@web/core/utils/hooks";

export class FaceRecognitionDialog extends Component {
    /**
     * Defines the static properties and initial state for the FaceRecognitionDialog component.
     */
    static template = "face_attendance.FaceRecognitionDialog";
    static components = {Dialog};
    static props = {
        close: {type: Function},
        onFaceWasFound: {type: Function, optional: true},
        onClose: {type: Function, optional: true}
    };
    videoRef = useRef("webcamFeed"); // Ref for the video element
    currentStream = null;
    detectionInterval = null;
    faceMatcher = null;
    isProcessingFrame = false;

    /**
     * Sets up the component by initializing services, loading a reference face from a static image for comparison,
     * and then starting the webcam for live face detection; also handles cleanup on unmount.
     */
    setup() {
        this.notification = useService("notification");
        this.rpc = useService("rpc");
        this.user = useService("user");

        onMounted(async () => {
            let labeledReferenceFace = null;
            try {
                const userImageDataUrl = await this.rpc("/face_attendance/employee_profile", {
                    current_user: this.user.userId,
                });
                const img = new Image();
                img.src = userImageDataUrl
                await new Promise((resolve, reject) => {
                    img.onload = resolve;
                    img.onerror = () => {
                        console.error("Error loading static image:", img.src);
                        reject("Image loading failed");
                    };
                });
                const detections = await faceapi
                    .detectSingleFace(img)
                    .withFaceLandmarks()
                    .withFaceDescriptor();
                if (detections && detections.descriptor) {
                    const userName = "Static User (Debug)";
                    labeledReferenceFace = new faceapi.LabeledFaceDescriptors(userName, [detections.descriptor]);
                    console.log("Face detected in static image. Ready for comparison.");
                } else {
                    this.notification.add("No face detected in the static comparison image. Please ensure it contains a clear face.", {
                        type: "warning",
                        sticky: true,
                    });
                    console.warn("No face detected in static comparison image.");
                }
            } catch (error) {
                console.error("Error processing static image for comparison:", error);
                this.notification.add(`Error with static image for comparison: ${error.message || error.name}`, {
                    type: "danger",
                    sticky: true
                });
            }

            if (labeledReferenceFace) {
                this.faceMatcher = new faceapi.FaceMatcher([labeledReferenceFace], 0.6);
            } else {
                this.notification.add("Face recognition failed: Could not prepare reference face from static image.", {
                    type: "danger",
                    sticky: true,
                });
                this.props.close({match: false, reason: "static_image_processing_failed"});
                return;
            }

            // --- Start Webcam and Detection Loop ---
            await this.startWebcam();
        });

        onWillUnmount(() => {
            this.stopWebcam();
        });
    }

    /**
     * Captures the current frame from the video feed as a PNG image Data URL.
     */
    captureImage() {
        const video = this.videoRef.el;
        if (!video || video.paused || video.ended) {
            console.warn("Cannot capture image: Video is not playing or not available.");
            return null;
        }
        const canvas = document.createElement('canvas');
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        const context = canvas.getContext('2d');
        context.drawImage(video, 0, 0, canvas.width, canvas.height);
        // Get the image data as a Data URL (PNG by default)
        const imageDataUrl = canvas.toDataURL('image/png');
        return imageDataUrl;
    }

    /**
     * Initiates webcam access, sets the video stream to the video element, and starts the face detection loop once the video begins playing. Handles various webcam access errors.
     */
    async startWebcam() {
        // Start webcam for create live image.
        try {
            this.currentStream = await navigator.mediaDevices.getUserMedia({
                video: {
                    width: {ideal: 640},
                    height: {ideal: 480},
                    facingMode: "user"
                }
            });
            if (this.videoRef.el) {
                this.videoRef.el.srcObject = this.currentStream;
                this.videoRef.el.onloadedmetadata = () => {
                    this.videoRef.el.play();
                    this.startFaceDetectionLoop(); // Start continuous detection after video plays
                };
            }
        } catch (err) {
            console.error("Error accessing webcam:", err);
            let errorMessage = "Error accessing webcam.";
            if (err.name === 'NotAllowedError') {
                errorMessage = "Permission denied to access camera. Please allow camera access.";
            } else if (err.name === 'NotFoundError') {
                errorMessage = "No camera found on this device.";
            } else {
                errorMessage = `An unknown error occurred while accessing camera: ${err.message || err.name}`;
            }
            this.notification.add(errorMessage, {type: "danger", sticky: true});
            this.props.close({match: false, reason: "webcam_error"});
        }
    }

    /**
     * Starts a continuous loop for face detection on the webcam feed, comparing detected faces against a reference.
     * If a match is found, it captures an image, stops the webcam, and triggers the `onFaceWasFound` callback with location data.
     * If no match or an error occurs, it closes the dialog and provides appropriate notifications.
     */
    startFaceDetectionLoop() {
        const video = this.videoRef.el;

        if (!video || !this.faceMatcher) {
            console.error("Video or FaceMatcher not ready for detection.");
            this.notification.add("Internal error: Recognition setup incomplete.", {type: "danger"});
            this.props.close({match: false, reason: "detection_setup_incomplete"});
            return;
        }
        const displaySize = {width: video.width, height: video.height};
        this.detectionInterval = setInterval(async () => {
            if (this.isProcessingFrame || video.paused || video.ended) {
                return;
            }
            this.isProcessingFrame = true;
            try {
                const detections = await faceapi
                    .detectSingleFace(video, new faceapi.SsdMobilenetv1Options())
                    .withFaceLandmarks()
                    .withFaceDescriptor();
                if (detections) {
                    const resizedDetections = faceapi.resizeResults(detections, displaySize);
                    const bestMatch = this.faceMatcher.findBestMatch(resizedDetections.descriptor);
                    if (bestMatch.label === 'Static User (Debug)' && bestMatch.distance < 0.6) {
                        this.notification.add("Face recognized successfully!", {type: "success"});
                        const capturedImageData = this.captureImage();
                        this.stopWebcam();
                        this.props.close({match: true, descriptor: resizedDetections.descriptor});
                        navigator.geolocation.getCurrentPosition(async ({coords: {latitude, longitude}}) => {
                            this.props.onFaceWasFound({
                                match: true,
                                descriptor: resizedDetections.descriptor,
                                selfie: capturedImageData,
                                coords: {latitude, longitude}
                            });
                        })
                    } else {
                        this.stopWebcam();
                        this.props.close({match: false, reason: "no_match"});
                        this.notification.add("Face not Found. Please try again or contact support.", {
                            type: "danger",
                        });
                        console.log("No match or distance too high:", bestMatch.toString());
                        // Provide UI feedback via text messages, not visual overlays
                    }
                } else {
                    console.log("No face detected in live stream.");
                    // Provide UI feedback via text messages
                }
            } catch (error) {
                console.error("Error during face detection or comparison loop:", error);
            } finally {
                this.isProcessingFrame = false;
            }
        }, 100);
    }

    /**
     * Stops the webcam stream and clears any active face detection intervals.
     */
    stopWebcam() {
        // ... (Remains the same)
        if (this.detectionInterval) {
            clearInterval(this.detectionInterval);
            this.detectionInterval = null;
        }
        if (this.currentStream) {
            this.currentStream.getTracks().forEach(track => track.stop());
            this.currentStream = null;
            if (this.videoRef.el) {
                this.videoRef.el.srcObject = null;
            }
        }
    }

    // Add a cancel button method if you have a button in XML
    onCancel() {
        this.stopWebcam();
        this.notification.add("Face recognition cancelled.", {type: "info"});
        this.props.close({match: false, reason: "user_cancelled"});
    }
}