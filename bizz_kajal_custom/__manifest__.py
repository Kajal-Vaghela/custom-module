{
    "name": "Bizz Kajal Custom",
    "version": "18.0.1.0.0",
    "summary": "Custom module for BizzAppDev technical round assignment by Kajal",
    "author": "Kajal Vaghela",
    "depends": ["base", "sale_management", "stock", "purchase", "mrp", "base_automation"],
    "data": [
        'views/stock_picking_views.xml',
        'views/sale_order_views.xml',
        'data/mail_templates_data.xml',
    ],
    "installable": True,
    "auto_install": False,
    "application": False
}
