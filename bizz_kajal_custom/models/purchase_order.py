from odoo import models, fields


class PurchaseOrder(models.Model):
    _inherit = 'purchase.order'

    category_id = fields.Many2one('product.category', string="Product Category", readonly=True)
