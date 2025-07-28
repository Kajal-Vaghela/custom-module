from odoo import models, fields, api


class StockPicking(models.Model):
    _inherit = 'stock.picking'

    sale_tag_ids = fields.Many2many('crm.tag', string='Sale Order Tags', copy=False, store=True)
