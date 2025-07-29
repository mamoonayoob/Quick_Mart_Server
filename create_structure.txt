@echo off
mkdir quickmart\config
mkdir quickmart\controllers
mkdir quickmart\middleware
mkdir quickmart\models
mkdir quickmart\routes
mkdir quickmart\services
mkdir quickmart\utils

type nul > quickmart\config\db.js
type nul > quickmart\config\cloudinary.js
type nul > quickmart\config\firebase.js
type nul > quickmart\config\stripe.js

type nul > quickmart\controllers\auth.controller.js
type nul > quickmart\controllers\user.controller.js
type nul > quickmart\controllers\product.controller.js
type nul > quickmart\controllers\order.controller.js
type nul > quickmart\controllers\vendor.controller.js
type nul > quickmart\controllers\delivery.controller.js
type nul > quickmart\controllers\admin.controller.js
type nul > quickmart\controllers\payment.controller.js

type nul > quickmart\middleware\auth.middleware.js
type nul > quickmart\middleware\error.middleware.js
type nul > quickmart\middleware\role.middleware.js
type nul > quickmart\middleware\upload.middleware.js

type nul > quickmart\models\user.model.js
type nul > quickmart\models\product.model.js
type nul > quickmart\models\order.model.js
type nul > quickmart\models\cart.model.js
type nul > quickmart\models\delivery.model.js
type nul > quickmart\models\notification.model.js

type nul > quickmart\routes\auth.routes.js
type nul > quickmart\routes\user.routes.js
type nul > quickmart\routes\product.routes.js
type nul > quickmart\routes\order.routes.js
type nul > quickmart\routes\vendor.routes.js
type nul > quickmart\routes\delivery.routes.js
type nul > quickmart\routes\admin.routes.js
type nul > quickmart\routes\payment.routes.js

type nul > quickmart\services\email.service.js
type nul > quickmart\services\firebase.service.js
type nul > quickmart\services\payment.service.js
type nul > quickmart\services\cloudinary.service.js
type nul > quickmart\services\maps.service.js

type nul > quickmart\utils\validators.js
type nul > quickmart\utils\helpers.js
type nul > quickmart\utils\constants.js

type nul > quickmart\.env
type nul > quickmart\.gitignore
type nul > quickmart\package.json
type nul > quickmart\server.js
type nul > quickmart\README.md
