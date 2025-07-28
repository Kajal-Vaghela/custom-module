from odoo import models, _
from odoo.exceptions import UserError


class MrpProduction(models.Model):
    _inherit = 'mrp.production'

    # Point-6: Manufacturing orders created from sale order should not allowed to change the qty after the confirmation.
    def write(self, vals):
        """Restrict 'product_qty' change on confirmed Manufacturing Order linked to Sale Orders."""
        for mo in self:
            if 'product_qty' in vals and mo.state in ['confirmed', 'progress', 'to_close']:
                if mo.origin:
                    sale_order = self.env['sale.order'].search([('name', '=', mo.origin)], limit=1)
                    if sale_order:
                        raise UserError(
                            _("You cannot change the manufacturing quantity after confirmation for MOs created from Sale Orders.")
                        )
        return super().write(vals)
