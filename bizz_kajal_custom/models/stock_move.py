from odoo import models


class StockMove(models.Model):
    _inherit = 'stock.move'

    # Point-3: Copy all the tags from sale order to Delivery orders created from sale order
    def _get_new_picking_values(self):
        """Copy tag value from sale order"""
        vals = super()._get_new_picking_values()
        tag = self.group_id.sale_id.tag_ids.ids
        vals['sale_tag_ids'] = tag
        return vals
