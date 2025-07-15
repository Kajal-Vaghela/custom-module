# -*- coding: utf-8 -*-

import base64
import io
import re

from PIL import Image
from odoo import http, _
from odoo.http import Controller, route, request, content_disposition
from odoo.addons.hr_attendance.controllers.main import HrAttendance
from odoo.http import request
import base64


class FaceAttendance(HrAttendance):

    def is_svg(self, data_bytes):
        """Check if the data is an SVG image."""
        try:
            header = data_bytes[:500].decode('utf-8').strip()
            return header.startswith("<?xml") and "<svg" in header
        except UnicodeDecodeError:
            return False

    def get_current_user_face_image_data(self, user_id):
        """Generate user face image data."""
        user = request.env['res.users'].sudo().browse(int(user_id))
        image_data = base64.b64decode(user.image_1920)
        if not user.image_1920 or self.is_svg(image_data):
            return False
        try:
            image = Image.open(io.BytesIO(image_data))
            buffer = io.BytesIO()
            image.save(buffer, format="PNG")
            img_str = base64.b64encode(buffer.getvalue()).decode("utf-8")
            return f"data:image/png;base64,{img_str}"
        except UnicodeDecodeError:
            return False

    def get_employee_info_response(self, employee):
        """Base method copy."""
        return employee

    @staticmethod
    def _get_geoip_response(mode, latitude=False, longitude=False, selfie=False):
        """
        For pass latitude and longitude. Base method copy.
        """
        if selfie and selfie.startswith('data:image'):
            header, base64_selfie = selfie.split(',', 1)
        else:
            base64_selfie = selfie
        return {
            'city': request.geoip.city.name or _('Unknown'),
            'country_name': request.geoip.country.name or request.geoip.continent.name or _('Unknown'),
            'latitude': latitude or request.geoip.location.latitude or False,
            'longitude': longitude or request.geoip.location.longitude or False,
            'ip_address': request.geoip.ip,
            'browser': request.httprequest.user_agent.browser,
            'mode': mode,
            'selfie': base64_selfie or False,
        }

    @http.route("/face_attendance/get_attendance_employee_data", type="json", auth="public")
    def get_employee_attendance_data(self, company, user, selfie, latitude=False, longitude=False):
        """ This method which is used for create an attendance after conforming user access."""
        if company:
            user = request.env["res.users"].sudo().browse(int(user))
            employee = user and user.employee_id
            if employee and employee.company_id.id == company:
                employee._attendance_action_change(self._get_geoip_response('kiosk', latitude, longitude, selfie))
                return self._get_employee_info_response(employee)
        return {}

    @http.route("/face_attendance/employee_profile", type="json", auth="public")
    def employee_attendance_profile(self, current_user):
        """ Pass the value for comparing user profile."""
        user_profile = self.get_current_user_face_image_data(current_user)
        return user_profile

    @http.route("/face_attendance/get_employee_status_data", type="json", auth="public")
    def employee_status_data(self, current_user):
        """ Pass the value for comparing user profile."""
        user_id = request.env["res.users"].browse(int(current_user))
        if user_id and user_id.attendance_state == "checked_out":
            return "red"
        else:
            return "green"
