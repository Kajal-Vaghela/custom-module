# -*- coding: utf-8 -*-

from odoo import fields, models, api, _
from odoo import http
from odoo.exceptions import ValidationError


class HrAttendance(models.Model):
    _inherit = "hr.attendance"

    in_selfie = fields.Binary(string="Check In Selfie")
    out_selfie = fields.Binary(string="Check Out Selfie")
