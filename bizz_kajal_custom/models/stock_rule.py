from odoo import models, api


class StockRule(models.Model):
    _inherit = 'stock.rule'

    # Point-7:Purchase orders created from the procurement should be splitted based on category
    @api.model
    def _run_buy(self, procurements):
        """Set product_id field in procurement values to use in PO domain filtering."""
        for procurement_tuple in procurements:
            procurement, rule = procurement_tuple
            procurement.values['product_id'] = procurement.product_id
        super()._run_buy(procurements)

    def _make_po_get_domain(self, company_id, values, partner):
        """Add product category to the PO domain to split Purchase Order by category."""
        res = super()._make_po_get_domain(company_id, values, partner)
        res += (('category_id', '=', values.get("product_id").categ_id.id),)
        return res
