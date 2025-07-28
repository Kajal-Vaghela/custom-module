from odoo import models, api


class ProductCategory(models.Model):
    _inherit = 'product.category'

    # Point: Category should have unique name
    # _sql_constraints = [
    #     ('unique_product_name', 'unique (name)', 'Product name must be unique!')
    # ]

    @api.constrains('name')
    def _check_product_name_unique(self):
        """
           Ensure that each product category has a unique name.
           Raises ValidationError if duplicate names are found.
        """
        for product_category in self:
            if self.search_count([('name', '=', product_category.name)]) > 1:
                raise models.ValidationError(
                    'Product Category name must be unique!')
