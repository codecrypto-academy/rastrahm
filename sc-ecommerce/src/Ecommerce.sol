// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "./IEuroToken.sol";
import "./IPaymentGateway.sol";

/**
 * @title Ecommerce
 * @dev Contrato principal para gestionar empresas, productos, clientes, carrito de compras y facturas
 * @notice Este contrato permite crear un sistema de e-commerce completo en blockchain
 */
contract Ecommerce is Ownable, ReentrancyGuard {
    // Referencias a contratos externos
    IEuroToken public immutable euroToken;
    IPaymentGateway public paymentGateway;

    // Contadores para IDs únicos
    uint256 private _companyCounter;
    uint256 private _productCounter;
    uint256 private _invoiceCounter;

    /**
     * @dev Estructura para registrar una empresa
     * @param companyId ID único de la empresa
     * @param name Nombre de la empresa
     * @param companyAddress Wallet donde recibe pagos
     * @param taxId Número de identificación fiscal
     * @param isActive Indica si la empresa está activa
     * @param ownerAddress Dirección del propietario de la empresa
     */
    struct Company {
        uint256 companyId;
        string name;
        address companyAddress;  // Wallet donde recibe pagos
        string taxId;
        bool isActive;
        address ownerAddress;
    }

    /**
     * @dev Estructura para registrar un producto
     * @param productId ID único del producto
     * @param companyId ID de la empresa propietaria
     * @param name Nombre del producto
     * @param description Descripción del producto
     * @param price Precio en unidades base con 6 decimales (ej: 100000000 = 100.000000 EURT)
     * @param stock Cantidad disponible en stock
     * @param ipfsImageHash Hash IPFS de la imagen del producto
     * @param isActive Indica si el producto está activo
     */
    struct Product {
        uint256 productId;
        uint256 companyId;
        string name;
        string description;
        uint256 price;           // En unidades base con 6 decimales
        uint256 stock;
        string ipfsImageHash;
        bool isActive;
    }

    /**
     * @dev Estructura para registrar un cliente
     * @param customerAddress Dirección del cliente (address de la wallet)
     * @param name Nombre del cliente
     * @param email Email del cliente
     * @param registeredAt Timestamp de registro
     * @param isActive Indica si el cliente está activo
     */
    struct Customer {
        address customerAddress;
        string name;
        string email;
        uint256 registeredAt;
        bool isActive;
    }

    /**
     * @dev Estructura para un item del carrito
     * @param productId ID del producto
     * @param quantity Cantidad del producto en el carrito
     */
    struct CartItem {
        uint256 productId;
        uint256 quantity;
    }

    /**
     * @dev Estructura para registrar una factura/venta
     * @param invoiceId ID único de la factura
     * @param companyId ID de la empresa
     * @param customerAddress Dirección del cliente
     * @param totalAmount Monto total en unidades base con 6 decimales
     * @param timestamp Timestamp de creación
     * @param isPaid Indica si la factura está pagada
     * @param paymentTxHash Hash de la transacción de pago
     * @param items Array de items de la factura (productId, quantity)
     */
    struct Invoice {
        uint256 invoiceId;
        uint256 companyId;
        address customerAddress;
        uint256 totalAmount;
        uint256 timestamp;
        bool isPaid;
        bytes32 paymentTxHash;
        CartItem[] items;
    }

    // Mapeos principales
    mapping(uint256 => Company) public companies;
    mapping(uint256 => Product) public products;
    mapping(address => Customer) public customers;
    mapping(address => CartItem[]) public carts;  // Carrito por cliente
    mapping(uint256 => Invoice) public invoices;

    // Mapeos auxiliares para búsquedas O(1)
    mapping(address => uint256) public companyByAddress;  // Dirección → companyId
    mapping(uint256 => uint256[]) public productsByCompany;  // companyId → productIds[]
    mapping(address => uint256[]) public invoicesByCustomer;  // customerAddress → invoiceIds[]
    mapping(uint256 => uint256[]) public invoicesByCompany;  // companyId → invoiceIds[]

    // Arrays para listar
    uint256[] public companyIds;
    uint256[] public productIds;
    address[] public customerAddresses;
    uint256[] public invoiceIds;

    // Eventos
    event CompanyRegistered(
        uint256 indexed companyId,
        address indexed ownerAddress,
        address indexed companyAddress,
        string name,
        string taxId
    );

    event ProductAdded(
        uint256 indexed productId,
        uint256 indexed companyId,
        string name,
        uint256 price,
        uint256 stock
    );

    event ProductUpdated(
        uint256 indexed productId,
        uint256 price,
        uint256 stock
    );

    event CustomerRegistered(
        address indexed customerAddress,
        string name,
        string email
    );

    event CustomerUpdated(
        address indexed customerAddress,
        string name,
        string email
    );

    event CartItemAdded(
        address indexed customer,
        uint256 indexed productId,
        uint256 quantity
    );

    event CartItemRemoved(
        address indexed customer,
        uint256 indexed productId
    );

    event CartCleared(address indexed customer);

    event InvoiceCreated(
        uint256 indexed invoiceId,
        uint256 indexed companyId,
        address indexed customerAddress,
        uint256 totalAmount
    );

    event InvoicePaid(
        uint256 indexed invoiceId,
        bytes32 indexed paymentTxHash
    );

    event PaymentGatewayUpdated(address indexed oldGateway, address indexed newGateway);

    /**
     * @dev Constructor del contrato
     * @param euroTokenAddress Dirección del contrato EuroToken
     * @param paymentGatewayAddress Dirección del contrato PaymentGateway
     * @param initialOwner Dirección del propietario inicial
     */
    constructor(
        address euroTokenAddress,
        address paymentGatewayAddress,
        address initialOwner
    ) Ownable(initialOwner) {
        require(euroTokenAddress != address(0), "Ecommerce: invalid EuroToken address");
        require(paymentGatewayAddress != address(0), "Ecommerce: invalid PaymentGateway address");
        require(initialOwner != address(0), "Ecommerce: invalid owner address");

        euroToken = IEuroToken(euroTokenAddress);
        paymentGateway = IPaymentGateway(paymentGatewayAddress);

        _companyCounter = 1;  // Empezar desde 1
        _productCounter = 1;
        _invoiceCounter = 1;
    }

    // ============ FUNCIONES DE EMPRESAS ============

    /**
     * @dev Registrar una nueva empresa
     * @param name Nombre de la empresa
     * @param companyAddress Wallet donde recibe pagos
     * @param taxId Número de identificación fiscal
     * @return uint256 ID de la empresa registrada
     */
    function registerCompany(
        string memory name,
        address companyAddress,
        string memory taxId
    ) external returns (uint256) {
        require(bytes(name).length > 0, "Ecommerce: name cannot be empty");
        require(companyAddress != address(0), "Ecommerce: companyAddress cannot be zero");
        require(bytes(taxId).length > 0, "Ecommerce: taxId cannot be empty");
        require(companyByAddress[companyAddress] == 0, "Ecommerce: address already registered");

        uint256 companyId = _companyCounter++;
        companies[companyId] = Company({
            companyId: companyId,
            name: name,
            companyAddress: companyAddress,
            taxId: taxId,
            isActive: true,
            ownerAddress: msg.sender
        });

        companyByAddress[companyAddress] = companyId;
        companyIds.push(companyId);

        emit CompanyRegistered(companyId, msg.sender, companyAddress, name, taxId);
        return companyId;
    }

    /**
     * @dev Obtener una empresa por ID
     * @param companyId ID de la empresa
     * @return Company Estructura de la empresa
     */
    function getCompany(uint256 companyId) external view returns (Company memory) {
        require(companies[companyId].companyId != 0, "Ecommerce: company does not exist");
        return companies[companyId];
    }

    /**
     * @dev Obtener todas las empresas
     * @return Company[] Array de todas las empresas
     */
    function getAllCompanies() external view returns (Company[] memory) {
        Company[] memory result = new Company[](companyIds.length);
        for (uint256 i = 0; i < companyIds.length; i++) {
            result[i] = companies[companyIds[i]];
        }
        return result;
    }

    /**
     * @dev Activar/desactivar una empresa (solo owner de la empresa)
     * @param companyId ID de la empresa
     * @param isActive Nuevo estado activo/inactivo
     */
    function setCompanyActive(uint256 companyId, bool isActive) external {
        require(companies[companyId].companyId != 0, "Ecommerce: company does not exist");
        require(
            companies[companyId].ownerAddress == msg.sender,
            "Ecommerce: only company owner can modify"
        );
        companies[companyId].isActive = isActive;
    }

    // ============ FUNCIONES DE PRODUCTOS ============

    /**
     * @dev Agregar un nuevo producto (solo owner de la empresa)
     * @param companyId ID de la empresa propietaria
     * @param name Nombre del producto
     * @param description Descripción del producto
     * @param price Precio en unidades base con 6 decimales
     * @param stock Cantidad inicial en stock
     * @param ipfsImageHash Hash IPFS de la imagen
     * @return uint256 ID del producto creado
     */
    function addProduct(
        uint256 companyId,
        string memory name,
        string memory description,
        uint256 price,
        uint256 stock,
        string memory ipfsImageHash
    ) external returns (uint256) {
        require(companies[companyId].companyId != 0, "Ecommerce: company does not exist");
        require(companies[companyId].isActive, "Ecommerce: company is not active");
        require(
            companies[companyId].ownerAddress == msg.sender,
            "Ecommerce: only company owner can add products"
        );
        require(bytes(name).length > 0, "Ecommerce: name cannot be empty");
        require(price > 0, "Ecommerce: price must be greater than zero");

        uint256 productId = _productCounter++;
        products[productId] = Product({
            productId: productId,
            companyId: companyId,
            name: name,
            description: description,
            price: price,
            stock: stock,
            ipfsImageHash: ipfsImageHash,
            isActive: true
        });

        productsByCompany[companyId].push(productId);
        productIds.push(productId);

        emit ProductAdded(productId, companyId, name, price, stock);
        return productId;
    }

    /**
     * @dev Actualizar un producto (solo owner de la empresa)
     * @param productId ID del producto
     * @param price Nuevo precio (0 para no cambiar)
     * @param stock Nueva cantidad de stock (type(uint256).max para no cambiar)
     */
    function updateProduct(
        uint256 productId,
        uint256 price,
        uint256 stock
    ) external {
        require(products[productId].productId != 0, "Ecommerce: product does not exist");
        uint256 companyId = products[productId].companyId;
        require(
            companies[companyId].ownerAddress == msg.sender,
            "Ecommerce: only company owner can update products"
        );

        if (price > 0) {
            products[productId].price = price;
        }
        if (stock != type(uint256).max) {
            products[productId].stock = stock;
        }

        emit ProductUpdated(productId, products[productId].price, products[productId].stock);
    }

    /**
     * @dev Activar/desactivar un producto (solo owner de la empresa)
     * @param productId ID del producto
     * @param isActive Nuevo estado activo/inactivo
     */
    function setProductActive(uint256 productId, bool isActive) external {
        require(products[productId].productId != 0, "Ecommerce: product does not exist");
        uint256 companyId = products[productId].companyId;
        require(
            companies[companyId].ownerAddress == msg.sender,
            "Ecommerce: only company owner can modify products"
        );
        products[productId].isActive = isActive;
    }

    /**
     * @dev Obtener un producto por ID
     * @param productId ID del producto
     * @return Product Estructura del producto
     */
    function getProduct(uint256 productId) external view returns (Product memory) {
        require(products[productId].productId != 0, "Ecommerce: product does not exist");
        return products[productId];
    }

    /**
     * @dev Obtener todos los productos
     * @return Product[] Array de todos los productos
     */
    function getAllProducts() external view returns (Product[] memory) {
        Product[] memory result = new Product[](productIds.length);
        for (uint256 i = 0; i < productIds.length; i++) {
            result[i] = products[productIds[i]];
        }
        return result;
    }

    /**
     * @dev Obtener productos de una empresa
     * @param companyId ID de la empresa
     * @return Product[] Array de productos de la empresa
     */
    function getProductsByCompany(uint256 companyId) external view returns (Product[] memory) {
        uint256[] memory productIdsArray = productsByCompany[companyId];
        Product[] memory result = new Product[](productIdsArray.length);
        for (uint256 i = 0; i < productIdsArray.length; i++) {
            result[i] = products[productIdsArray[i]];
        }
        return result;
    }

    // ============ FUNCIONES DE CLIENTES ============

    /**
     * @dev Registrar un nuevo cliente
     * @param name Nombre del cliente
     * @param email Email del cliente
     */
    function registerCustomer(string memory name, string memory email) external {
        require(bytes(name).length > 0, "Ecommerce: name cannot be empty");
        require(bytes(email).length > 0, "Ecommerce: email cannot be empty");
        require(customers[msg.sender].registeredAt == 0, "Ecommerce: customer already registered");

        customers[msg.sender] = Customer({
            customerAddress: msg.sender,
            name: name,
            email: email,
            registeredAt: block.timestamp,
            isActive: true
        });

        customerAddresses.push(msg.sender);

        emit CustomerRegistered(msg.sender, name, email);
    }

    /**
     * @dev Actualizar información de cliente
     * @param name Nuevo nombre (cadena vacía para no cambiar)
     * @param email Nuevo email (cadena vacía para no cambiar)
     */
    function updateCustomer(string memory name, string memory email) external {
        require(customers[msg.sender].registeredAt != 0, "Ecommerce: customer not registered");

        if (bytes(name).length > 0) {
            customers[msg.sender].name = name;
        }
        if (bytes(email).length > 0) {
            customers[msg.sender].email = email;
        }

        emit CustomerUpdated(msg.sender, customers[msg.sender].name, customers[msg.sender].email);
    }

    /**
     * @dev Obtener un cliente por dirección
     * @param customerAddress Dirección del cliente
     * @return Customer Estructura del cliente
     */
    function getCustomer(address customerAddress) external view returns (Customer memory) {
        require(customers[customerAddress].registeredAt != 0, "Ecommerce: customer does not exist");
        return customers[customerAddress];
    }

    /**
     * @dev Obtener todos los clientes
     * @return Customer[] Array de todos los clientes
     */
    function getAllCustomers() external view returns (Customer[] memory) {
        Customer[] memory result = new Customer[](customerAddresses.length);
        for (uint256 i = 0; i < customerAddresses.length; i++) {
            result[i] = customers[customerAddresses[i]];
        }
        return result;
    }

    // ============ FUNCIONES DE CARRITO ============

    /**
     * @dev Agregar un producto al carrito
     * @param productId ID del producto
     * @param quantity Cantidad a agregar
     */
    function addToCart(uint256 productId, uint256 quantity) external {
        require(products[productId].productId != 0, "Ecommerce: product does not exist");
        require(products[productId].isActive, "Ecommerce: product is not active");
        require(products[productId].stock >= quantity, "Ecommerce: insufficient stock");
        require(quantity > 0, "Ecommerce: quantity must be greater than zero");

        CartItem[] storage cart = carts[msg.sender];
        bool found = false;

        // Buscar si el producto ya está en el carrito
        for (uint256 i = 0; i < cart.length; i++) {
            if (cart[i].productId == productId) {
                // Actualizar cantidad
                uint256 newQuantity = cart[i].quantity + quantity;
                require(products[productId].stock >= newQuantity, "Ecommerce: insufficient stock for total quantity");
                cart[i].quantity = newQuantity;
                found = true;
                break;
            }
        }

        // Si no está en el carrito, agregarlo
        if (!found) {
            cart.push(CartItem({productId: productId, quantity: quantity}));
        }

        emit CartItemAdded(msg.sender, productId, quantity);
    }

    /**
     * @dev Remover un producto del carrito
     * @param productId ID del producto
     */
    function removeFromCart(uint256 productId) external {
        CartItem[] storage cart = carts[msg.sender];
        bool found = false;

        for (uint256 i = 0; i < cart.length; i++) {
            if (cart[i].productId == productId) {
                // Mover el último elemento a la posición i y reducir el array
                cart[i] = cart[cart.length - 1];
                cart.pop();
                found = true;
                break;
            }
        }

        require(found, "Ecommerce: product not in cart");

        emit CartItemRemoved(msg.sender, productId);
    }

    /**
     * @dev Actualizar cantidad de un producto en el carrito
     * @param productId ID del producto
     * @param quantity Nueva cantidad
     */
    function updateCartQuantity(uint256 productId, uint256 quantity) external {
        require(products[productId].productId != 0, "Ecommerce: product does not exist");
        require(quantity > 0, "Ecommerce: quantity must be greater than zero");
        require(products[productId].stock >= quantity, "Ecommerce: insufficient stock");

        CartItem[] storage cart = carts[msg.sender];
        bool found = false;

        for (uint256 i = 0; i < cart.length; i++) {
            if (cart[i].productId == productId) {
                cart[i].quantity = quantity;
                found = true;
                break;
            }
        }

        require(found, "Ecommerce: product not in cart");

        emit CartItemAdded(msg.sender, productId, quantity);
    }

    /**
     * @dev Obtener el carrito de un cliente
     * @param customer Dirección del cliente
     * @return CartItem[] Array de items del carrito
     */
    function getCart(address customer) external view returns (CartItem[] memory) {
        return carts[customer];
    }

    /**
     * @dev Calcular el total del carrito de un cliente
     * @param customer Dirección del cliente
     * @return uint256 Monto total en unidades base con 6 decimales
     */
    function getCartTotal(address customer) external view returns (uint256) {
        CartItem[] memory cart = carts[customer];
        uint256 total = 0;

        for (uint256 i = 0; i < cart.length; i++) {
            Product memory product = products[cart[i].productId];
            total += product.price * cart[i].quantity;
        }

        return total;
    }

    /**
     * @dev Limpiar el carrito de un cliente
     * @param customer Dirección del cliente
     */
    function clearCart(address customer) external {
        require(
            msg.sender == customer || msg.sender == owner(),
            "Ecommerce: only customer or owner can clear cart"
        );

        delete carts[customer];

        emit CartCleared(customer);
    }

    // ============ FUNCIONES DE FACTURAS ============

    /**
     * @dev Crear una factura desde el carrito de un cliente
     * @param customer Dirección del cliente
     * @param companyId ID de la empresa
     * @return uint256 ID de la factura creada
     */
    function createInvoice(address customer, uint256 companyId) external nonReentrant returns (uint256) {
        require(companies[companyId].companyId != 0, "Ecommerce: company does not exist");
        require(companies[companyId].isActive, "Ecommerce: company is not active");
        require(customers[customer].registeredAt != 0, "Ecommerce: customer not registered");
        require(
            msg.sender == customer || msg.sender == owner(),
            "Ecommerce: only customer or owner can create invoice"
        );

        CartItem[] memory cart = carts[customer];
        require(cart.length > 0, "Ecommerce: cart is empty");

        // SEGURIDAD: Obtener invoiceId ANTES de modificar el contador
        uint256 invoiceId = _invoiceCounter++;
        
        uint256 totalAmount = 0;
        Invoice storage invoice = invoices[invoiceId];

        // SEGURIDAD: Validar stock y reducir inmediatamente para prevenir race conditions
        // Patrón: Validar -> Reducir stock -> Calcular total (todo en un solo bucle)
        for (uint256 i = 0; i < cart.length; i++) {
            uint256 productId = cart[i].productId;
            Product storage product = products[productId];  // Cambiar a storage para modificar

            require(product.productId != 0, "Ecommerce: product does not exist");
            require(product.companyId == companyId, "Ecommerce: all items must be from same company");
            require(product.isActive, "Ecommerce: product is not active");
            require(product.stock >= cart[i].quantity, "Ecommerce: insufficient stock");

            // SEGURIDAD: Reducir stock INMEDIATAMENTE después de validar (previene race conditions)
            product.stock -= cart[i].quantity;

            totalAmount += product.price * cart[i].quantity;
            invoice.items.push(cart[i]);
        }

        require(totalAmount > 0, "Ecommerce: total amount must be greater than zero");

        // Crear la factura (con invoiceId ya determinado)
        invoice.invoiceId = invoiceId;
        invoice.companyId = companyId;
        invoice.customerAddress = customer;
        invoice.totalAmount = totalAmount;
        invoice.timestamp = block.timestamp;
        invoice.isPaid = false;
        invoice.paymentTxHash = bytes32(0);

        // Registrar invoiceId en arrays y mappings
        invoiceIds.push(invoiceId);
        invoicesByCustomer[customer].push(invoiceId);
        invoicesByCompany[companyId].push(invoiceId);

        // Limpiar el carrito
        delete carts[customer];

        emit InvoiceCreated(invoiceId, companyId, customer, totalAmount);
        emit CartCleared(customer);

        return invoiceId;
    }

    /**
     * @dev Procesar pago de una factura usando PaymentGateway
     * @param invoiceId ID de la factura
     * @param paymentId ID único del pago (generado por el frontend)
     * @return bool true si el pago fue exitoso
     */
    function processPayment(uint256 invoiceId, string memory paymentId) external nonReentrant returns (bool) {
        Invoice storage invoice = invoices[invoiceId];
        require(invoice.invoiceId != 0, "Ecommerce: invoice does not exist");
        require(!invoice.isPaid, "Ecommerce: invoice already paid");
        require(
            msg.sender == invoice.customerAddress,
            "Ecommerce: only customer can pay invoice"
        );

        Company memory company = companies[invoice.companyId];

        // Procesar pago a través del PaymentGateway
        bool success = paymentGateway.processPayment(
            paymentId,
            invoice.customerAddress,
            company.companyAddress,
            invoice.totalAmount,
            string(abi.encodePacked("INV-", _uint256ToString(invoiceId)))
        );

        require(success, "Ecommerce: payment processing failed");

        // Actualizar factura
        invoice.isPaid = true;
        invoice.paymentTxHash = keccak256(abi.encodePacked(paymentId, block.timestamp));

        emit InvoicePaid(invoiceId, invoice.paymentTxHash);

        return true;
    }

    /**
     * @dev Obtener una factura por ID
     * @param invoiceId ID de la factura
     * @return Invoice Estructura de la factura
     */
    function getInvoice(uint256 invoiceId) external view returns (Invoice memory) {
        require(invoices[invoiceId].invoiceId != 0, "Ecommerce: invoice does not exist");
        return invoices[invoiceId];
    }

    /**
     * @dev Obtener facturas de un cliente
     * @param customer Dirección del cliente
     * @return Invoice[] Array de facturas del cliente
     */
    function getInvoicesByCustomer(address customer) external view returns (Invoice[] memory) {
        uint256[] memory invoiceIdsArray = invoicesByCustomer[customer];
        Invoice[] memory result = new Invoice[](invoiceIdsArray.length);
        for (uint256 i = 0; i < invoiceIdsArray.length; i++) {
            result[i] = invoices[invoiceIdsArray[i]];
        }
        return result;
    }

    /**
     * @dev Obtener facturas de una empresa
     * @param companyId ID de la empresa
     * @return Invoice[] Array de facturas de la empresa
     */
    function getInvoicesByCompany(uint256 companyId) external view returns (Invoice[] memory) {
        uint256[] memory invoiceIdsArray = invoicesByCompany[companyId];
        Invoice[] memory result = new Invoice[](invoiceIdsArray.length);
        for (uint256 i = 0; i < invoiceIdsArray.length; i++) {
            result[i] = invoices[invoiceIdsArray[i]];
        }
        return result;
    }

    /**
     * @dev Obtener todas las facturas
     * @return Invoice[] Array de todas las facturas
     */
    function getAllInvoices() external view returns (Invoice[] memory) {
        Invoice[] memory result = new Invoice[](invoiceIds.length);
        for (uint256 i = 0; i < invoiceIds.length; i++) {
            result[i] = invoices[invoiceIds[i]];
        }
        return result;
    }

    // ============ FUNCIONES ADMIN ============

    /**
     * @dev Actualizar la dirección del PaymentGateway (solo owner)
     * @param newPaymentGateway Nueva dirección del PaymentGateway
     */
    function setPaymentGateway(address newPaymentGateway) external onlyOwner {
        require(newPaymentGateway != address(0), "Ecommerce: invalid PaymentGateway address");
        address oldGateway = address(paymentGateway);
        paymentGateway = IPaymentGateway(newPaymentGateway);
        emit PaymentGatewayUpdated(oldGateway, newPaymentGateway);
    }

    // ============ FUNCIONES AUXILIARES ============

    /**
     * @dev Convertir uint256 a string (función auxiliar)
     * @param value Valor a convertir
     * @return string Representación en string
     */
    function _uint256ToString(uint256 value) private pure returns (string memory) {
        if (value == 0) {
            return "0";
        }
        uint256 temp = value;
        uint256 digits;
        while (temp != 0) {
            digits++;
            temp /= 10;
        }
        bytes memory buffer = new bytes(digits);
        while (value != 0) {
            digits -= 1;
            buffer[digits] = bytes1(uint8(48 + uint256(value % 10)));
            value /= 10;
        }
        return string(buffer);
    }
}

