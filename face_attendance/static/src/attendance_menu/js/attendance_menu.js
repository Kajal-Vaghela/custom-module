/** @odoo-module **/

import {Component, onMounted, onWillStart} from "@odoo/owl";
import {useService} from "@web/core/utils/hooks";
import {registry} from "@web/core/registry";
import {FaceRecognitionDialog} from "./face_recognition_dialog";

class FaceLoginSystrayItem extends Component {
    /**
     * Sets up the component by initializing services, loading Face-API.js models, and changing an icon's color on mount.
     */
    setup() {
        super.setup();
        this.notification = useService("notification");
        this.dialogService = useService("dialog");
        this.currentStream = null;
        this.user = useService("user");
        this.company = useService("company");
        this.rpc = useService("rpc");
        onWillStart(async () => {
            try {
                await Promise.all([
                    faceapi.nets.ssdMobilenetv1.loadFromUri("/face_attendance/static/models"),
                    faceapi.nets.faceRecognitionNet.loadFromUri("/face_attendance/static/models"),
                    faceapi.nets.faceLandmark68Net.loadFromUri("/face_attendance/static/models"),
                ]);
            } catch (error) {
                console.error("Error loading Face-API.js models:", error);
            }
        });
        onMounted(this.changeIconColor.bind(this));
    }

    /**
    * Fetches employee status, updates 'face' icon color, and hides the Attendance element.
    */
    async changeIconColor(){
        const current_user = this.user.userId
        let color = await this.rpc('/face_attendance/get_employee_status_data', {current_user})
        let starIcons = document.getElementById("face");
        console.log(starIcons)
        starIcons.style.color = color;
        const elementToHide = document.querySelector('[aria-label="Attendance"]')?.parentElement?.parentElement;
        elementToHide.style.display = 'none';
    }
    /**
     * Opens a face recognition dialog, handles successful recognition to log attendance,
     * and provides notifications for recognition outcomes.
     */
    openFaceRecognitionDialogMulti() {
        this.dialogService.add(FaceRecognitionDialog, {
            onFaceWasFound: async ({match, descriptor, selfie, coords: {latitude, longitude}}) => {
                debugger
                const company = this.company.currentCompany.id
                const user = this.user.userId
                await this.rpc('/face_attendance/get_attendance_employee_data',
                    {company, user, selfie, latitude, longitude})
                this.changeIconColor()
            },
            onClose: (result) => {
                if (result && result.match) {
                    this.notification.add("Face recognized successfully! Proceeding with attendance.", {
                        type: "success",
                    });
                } else {
                    this.notification.add("Face not recognized. Please try again or contact support.", {
                        type: "danger",
                    });
                }
            },
        });
    }
}

FaceLoginSystrayItem.template = "face_attendance.FaceLoginSystray";

// Register the component to the systray menu
registry.category("systray").add("FaceLoginSystrayItem", {
    Component: FaceLoginSystrayItem,
    sequence: 100, // Adjust this sequence to control its position
});