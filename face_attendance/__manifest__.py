# -*- coding: utf-8 -*-
{
    "name": "Face Attendance",
    "summary": """Face Attendance""",
    "description": """Face Attendance.""",
    "author": "Kajal Vaghela",
    "category": "HR/Attendance",
    "version": "17.0.1.0.0",
    "license": "AGPL-3",
    "depends": ["base", "web", "hr_attendance"],
    "assets": {
        "web.assets_backend": [
            "face_attendance/static/src/attendance_menu/**/*",
            "face_attendance/static/src/lib/face-api.min.js",
        ],
    },
    "data": [
        "views/hr_attendance_view.xml",
    ],
    "auto_install": False,
    "installable": True,
    "application": True,
    "currency": "EUR",
    "price": "49.0",
}
