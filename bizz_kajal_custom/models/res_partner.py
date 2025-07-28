from odoo import models, api


class ResPartner(models.Model):
    _inherit = 'res.partner'

    # Point: In Many2one field of partner, it should include Ref in the format PARTNER NAME [REF]
    def name_get(self):
        """
           Display partner name in Many2one fields as 'Partner Name [Ref]'.
       """
        result = []
        for partner in self:
            name = partner.name or ''
            if partner.ref:
                name += f" [{partner.ref}]"
            result.append((partner.id, name))
        return result

    # Point: Partner should be search on the Ref field from all Many2one widgets
    @api.model
    def name_search(self, name, args=None, operator='ilike', limit=100):
        """
            Allow searching partners by reference or name in Many2one fields.
        """
        args = args or []
        if name:
            args = ['|', ('ref', operator, name), ('name', operator, name)] + args
        return self.search(args, limit=limit).name_get()
