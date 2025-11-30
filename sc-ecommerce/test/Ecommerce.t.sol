// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Test, console} from "forge-std/Test.sol";
import {Ecommerce} from "../src/Ecommerce.sol";
import {MockEuroToken} from "./MockEuroToken.sol";
import {MockPaymentGateway} from "./MockPaymentGateway.sol";

/**
 * @title EcommerceTest
 * @dev Suite completa de tests para el contrato Ecommerce
 */
contract EcommerceTest is Test {
    Ecommerce public ecommerce;
    MockEuroToken public euroToken;
    MockPaymentGateway public paymentGateway;

    // Direcciones de prueba
    address public owner;
    address public companyOwner1;
    address public companyOwner2;
    address public customer1;
    address public customer2;
    address public nonOwner;

    // IDs para tests
    uint256 public companyId1;
    uint256 public companyId2;
    uint256 public productId1;
    uint256 public productId2;
    uint256 public invoiceId1;

    function setUp() public {
        owner = address(this);
        companyOwner1 = makeAddr("companyOwner1");
        companyOwner2 = makeAddr("companyOwner2");
        customer1 = makeAddr("customer1");
        customer2 = makeAddr("customer2");
        nonOwner = makeAddr("nonOwner");

        // Desplegar MockEuroToken
        euroToken = new MockEuroToken(owner);

        // Desplegar MockPaymentGateway
        paymentGateway = new MockPaymentGateway(address(euroToken), owner);
        paymentGateway.grantPaymentProcessorRole(address(paymentGateway));

        // Desplegar Ecommerce
        ecommerce = new Ecommerce(address(euroToken), address(paymentGateway), owner);

        // Dar rol de procesador de pagos al contrato Ecommerce
        paymentGateway.grantPaymentProcessorRole(address(ecommerce));

        // Mint tokens a los clientes para que puedan pagar
        euroToken.mint(customer1, 10000 * 10**6); // 10000 EURT
        euroToken.mint(customer2, 5000 * 10**6);  // 5000 EURT

        console.log("Ecommerce deployed at:", address(ecommerce));
        console.log("MockEuroToken deployed at:", address(euroToken));
        console.log("MockPaymentGateway deployed at:", address(paymentGateway));
    }

    // ============ TESTS DE DEPLOY ============

    function test_Deploy() public {
        assertTrue(address(ecommerce) != address(0), "Contract should be deployed");
        assertEq(address(ecommerce.euroToken()), address(euroToken), "EuroToken address should be set");
        assertEq(address(ecommerce.paymentGateway()), address(paymentGateway), "PaymentGateway address should be set");

        console.log("[PASS] Deploy test passed");
    }

    // ============ TESTS DE EMPRESAS ============

    function test_RegisterCompany() public {
        vm.prank(companyOwner1);
        uint256 companyId = ecommerce.registerCompany(
            "Mi Tienda",
            companyOwner1,
            "TAX123456"
        );

        assertEq(companyId, 1, "Company ID should be 1");
        
        Ecommerce.Company memory company = ecommerce.getCompany(companyId);
        assertEq(company.name, "Mi Tienda", "Company name should match");
        assertEq(company.companyAddress, companyOwner1, "Company address should match");
        assertEq(company.taxId, "TAX123456", "Tax ID should match");
        assertTrue(company.isActive, "Company should be active");

        console.log("[PASS] Register company test passed");
    }

    function test_RegisterMultipleCompanies() public {
        vm.prank(companyOwner1);
        uint256 companyId1 = ecommerce.registerCompany("Tienda 1", companyOwner1, "TAX111");

        vm.prank(companyOwner2);
        uint256 companyId2 = ecommerce.registerCompany("Tienda 2", companyOwner2, "TAX222");

        assertEq(companyId1, 1, "First company ID should be 1");
        assertEq(companyId2, 2, "Second company ID should be 2");

        Ecommerce.Company[] memory companies = ecommerce.getAllCompanies();
        assertEq(companies.length, 2, "Should have 2 companies");

        console.log("[PASS] Register multiple companies test passed");
    }

    function test_SetCompanyActive() public {
        vm.prank(companyOwner1);
        uint256 companyId = ecommerce.registerCompany("Tienda", companyOwner1, "TAX123");

        vm.prank(companyOwner1);
        ecommerce.setCompanyActive(companyId, false);

        Ecommerce.Company memory company = ecommerce.getCompany(companyId);
        assertFalse(company.isActive, "Company should be inactive");

        console.log("[PASS] Set company active test passed");
    }

    function test_OnlyCompanyOwnerCanModify() public {
        vm.prank(companyOwner1);
        uint256 companyId = ecommerce.registerCompany("Tienda", companyOwner1, "TAX123");

        vm.prank(nonOwner);
        vm.expectRevert("Ecommerce: only company owner can modify");
        ecommerce.setCompanyActive(companyId, false);

        console.log("[PASS] Only company owner can modify test passed");
    }

    // ============ TESTS DE PRODUCTOS ============

    function test_AddProduct() public {
        vm.prank(companyOwner1);
        uint256 companyId = ecommerce.registerCompany("Tienda", companyOwner1, "TAX123");

        vm.prank(companyOwner1);
        uint256 productId = ecommerce.addProduct(
            companyId,
            "Producto 1",
            "Descripcion del producto",
            100 * 10**6,  // 100 EURT
            50,           // Stock: 50
            "ipfs_hash_123"
        );

        assertEq(productId, 1, "Product ID should be 1");

        Ecommerce.Product memory product = ecommerce.getProduct(productId);
        assertEq(product.name, "Producto 1", "Product name should match");
        assertEq(product.price, 100 * 10**6, "Product price should match");
        assertEq(product.stock, 50, "Product stock should match");

        console.log("[PASS] Add product test passed");
    }

    function test_UpdateProduct() public {
        vm.prank(companyOwner1);
        uint256 companyId = ecommerce.registerCompany("Tienda", companyOwner1, "TAX123");

        vm.prank(companyOwner1);
        uint256 productId = ecommerce.addProduct(companyId, "Producto", "Desc", 100 * 10**6, 50, "hash");

        vm.prank(companyOwner1);
        ecommerce.updateProduct(productId, 150 * 10**6, 75);

        Ecommerce.Product memory product = ecommerce.getProduct(productId);
        assertEq(product.price, 150 * 10**6, "Price should be updated");
        assertEq(product.stock, 75, "Stock should be updated");

        console.log("[PASS] Update product test passed");
    }

    function test_SetProductActive() public {
        vm.prank(companyOwner1);
        uint256 companyId = ecommerce.registerCompany("Tienda", companyOwner1, "TAX123");

        vm.prank(companyOwner1);
        uint256 productId = ecommerce.addProduct(companyId, "Producto", "Desc", 100 * 10**6, 50, "hash");

        vm.prank(companyOwner1);
        ecommerce.setProductActive(productId, false);

        Ecommerce.Product memory product = ecommerce.getProduct(productId);
        assertFalse(product.isActive, "Product should be inactive");

        console.log("[PASS] Set product active test passed");
    }

    function test_GetProductsByCompany() public {
        vm.prank(companyOwner1);
        uint256 companyId = ecommerce.registerCompany("Tienda", companyOwner1, "TAX123");

        vm.prank(companyOwner1);
        ecommerce.addProduct(companyId, "Producto 1", "Desc 1", 100 * 10**6, 50, "hash1");

        vm.prank(companyOwner1);
        ecommerce.addProduct(companyId, "Producto 2", "Desc 2", 200 * 10**6, 30, "hash2");

        Ecommerce.Product[] memory products = ecommerce.getProductsByCompany(companyId);
        assertEq(products.length, 2, "Should have 2 products");

        console.log("[PASS] Get products by company test passed");
    }

    // ============ TESTS DE CLIENTES ============

    function test_RegisterCustomer() public {
        vm.prank(customer1);
        ecommerce.registerCustomer("Juan Perez", "juan@example.com");

        Ecommerce.Customer memory customer = ecommerce.getCustomer(customer1);
        assertEq(customer.name, "Juan Perez", "Customer name should match");
        assertEq(customer.email, "juan@example.com", "Customer email should match");
        assertTrue(customer.isActive, "Customer should be active");

        console.log("[PASS] Register customer test passed");
    }

    function test_UpdateCustomer() public {
        vm.prank(customer1);
        ecommerce.registerCustomer("Juan Perez", "juan@example.com");

        vm.prank(customer1);
        ecommerce.updateCustomer("Juan Carlos Perez", "juan.carlos@example.com");

        Ecommerce.Customer memory customer = ecommerce.getCustomer(customer1);
        assertEq(customer.name, "Juan Carlos Perez", "Name should be updated");
        assertEq(customer.email, "juan.carlos@example.com", "Email should be updated");

        console.log("[PASS] Update customer test passed");
    }

    function test_GetAllCustomers() public {
        vm.prank(customer1);
        ecommerce.registerCustomer("Cliente 1", "cliente1@example.com");

        vm.prank(customer2);
        ecommerce.registerCustomer("Cliente 2", "cliente2@example.com");

        Ecommerce.Customer[] memory customers = ecommerce.getAllCustomers();
        assertEq(customers.length, 2, "Should have 2 customers");

        console.log("[PASS] Get all customers test passed");
    }

    // ============ TESTS DE CARRITO ============

    function test_AddToCart() public {
        // Setup: crear empresa y producto
        vm.prank(companyOwner1);
        uint256 companyId = ecommerce.registerCompany("Tienda", companyOwner1, "TAX123");

        vm.prank(companyOwner1);
        uint256 productId = ecommerce.addProduct(companyId, "Producto", "Desc", 100 * 10**6, 50, "hash");

        // Agregar al carrito
        vm.prank(customer1);
        ecommerce.addToCart(productId, 5);

        Ecommerce.CartItem[] memory cart = ecommerce.getCart(customer1);
        assertEq(cart.length, 1, "Cart should have 1 item");
        assertEq(cart[0].productId, productId, "Product ID should match");
        assertEq(cart[0].quantity, 5, "Quantity should match");

        console.log("[PASS] Add to cart test passed");
    }

    function test_AddToCartUpdatesQuantity() public {
        vm.prank(companyOwner1);
        uint256 companyId = ecommerce.registerCompany("Tienda", companyOwner1, "TAX123");

        vm.prank(companyOwner1);
        uint256 productId = ecommerce.addProduct(companyId, "Producto", "Desc", 100 * 10**6, 50, "hash");

        vm.prank(customer1);
        ecommerce.addToCart(productId, 3);

        vm.prank(customer1);
        ecommerce.addToCart(productId, 2);

        Ecommerce.CartItem[] memory cart = ecommerce.getCart(customer1);
        assertEq(cart.length, 1, "Cart should have 1 item");
        assertEq(cart[0].quantity, 5, "Quantity should be updated to 5");

        console.log("[PASS] Add to cart updates quantity test passed");
    }

    function test_RemoveFromCart() public {
        vm.prank(companyOwner1);
        uint256 companyId = ecommerce.registerCompany("Tienda", companyOwner1, "TAX123");

        vm.prank(companyOwner1);
        uint256 productId = ecommerce.addProduct(companyId, "Producto", "Desc", 100 * 10**6, 50, "hash");

        vm.prank(customer1);
        ecommerce.addToCart(productId, 5);

        vm.prank(customer1);
        ecommerce.removeFromCart(productId);

        Ecommerce.CartItem[] memory cart = ecommerce.getCart(customer1);
        assertEq(cart.length, 0, "Cart should be empty");

        console.log("[PASS] Remove from cart test passed");
    }

    function test_UpdateCartQuantity() public {
        vm.prank(companyOwner1);
        uint256 companyId = ecommerce.registerCompany("Tienda", companyOwner1, "TAX123");

        vm.prank(companyOwner1);
        uint256 productId = ecommerce.addProduct(companyId, "Producto", "Desc", 100 * 10**6, 50, "hash");

        vm.prank(customer1);
        ecommerce.addToCart(productId, 3);

        vm.prank(customer1);
        ecommerce.updateCartQuantity(productId, 10);

        Ecommerce.CartItem[] memory cart = ecommerce.getCart(customer1);
        assertEq(cart[0].quantity, 10, "Quantity should be updated to 10");

        console.log("[PASS] Update cart quantity test passed");
    }

    function test_GetCartTotal() public {
        vm.prank(companyOwner1);
        uint256 companyId = ecommerce.registerCompany("Tienda", companyOwner1, "TAX123");

        vm.prank(companyOwner1);
        uint256 productId1 = ecommerce.addProduct(companyId, "Producto 1", "Desc", 100 * 10**6, 50, "hash1");

        vm.prank(companyOwner1);
        uint256 productId2 = ecommerce.addProduct(companyId, "Producto 2", "Desc", 200 * 10**6, 30, "hash2");

        vm.prank(customer1);
        ecommerce.addToCart(productId1, 2);  // 2 * 100 = 200

        vm.prank(customer1);
        ecommerce.addToCart(productId2, 3);  // 3 * 200 = 600

        uint256 total = ecommerce.getCartTotal(customer1);
        assertEq(total, 800 * 10**6, "Total should be 800 EURT");

        console.log("[PASS] Get cart total test passed");
    }

    function test_ClearCart() public {
        vm.prank(companyOwner1);
        uint256 companyId = ecommerce.registerCompany("Tienda", companyOwner1, "TAX123");

        vm.prank(companyOwner1);
        uint256 productId = ecommerce.addProduct(companyId, "Producto", "Desc", 100 * 10**6, 50, "hash");

        vm.prank(customer1);
        ecommerce.addToCart(productId, 5);

        vm.prank(customer1);
        ecommerce.clearCart(customer1);

        Ecommerce.CartItem[] memory cart = ecommerce.getCart(customer1);
        assertEq(cart.length, 0, "Cart should be empty");

        console.log("[PASS] Clear cart test passed");
    }

    // ============ TESTS DE FACTURAS ============

    function test_CreateInvoice() public {
        // Setup
        vm.prank(companyOwner1);
        uint256 companyId = ecommerce.registerCompany("Tienda", companyOwner1, "TAX123");

        vm.prank(companyOwner1);
        uint256 productId = ecommerce.addProduct(companyId, "Producto", "Desc", 100 * 10**6, 50, "hash");

        vm.prank(customer1);
        ecommerce.registerCustomer("Cliente", "cliente@example.com");

        vm.prank(customer1);
        ecommerce.addToCart(productId, 5);

        // Crear invoice
        vm.prank(customer1);
        uint256 invoiceId = ecommerce.createInvoice(customer1, companyId);

        assertEq(invoiceId, 1, "Invoice ID should be 1");

        Ecommerce.Invoice memory invoice = ecommerce.getInvoice(invoiceId);
        assertEq(invoice.companyId, companyId, "Company ID should match");
        assertEq(invoice.customerAddress, customer1, "Customer address should match");
        assertEq(invoice.totalAmount, 500 * 10**6, "Total should be 500 EURT");
        assertFalse(invoice.isPaid, "Invoice should not be paid");

        // Verificar que el stock se redujo
        Ecommerce.Product memory product = ecommerce.getProduct(productId);
        assertEq(product.stock, 45, "Stock should be reduced to 45");

        // Verificar que el carrito se limpió
        Ecommerce.CartItem[] memory cart = ecommerce.getCart(customer1);
        assertEq(cart.length, 0, "Cart should be empty");

        console.log("[PASS] Create invoice test passed");
    }

    function test_ProcessPayment() public {
        // Setup
        vm.prank(companyOwner1);
        uint256 companyId = ecommerce.registerCompany("Tienda", companyOwner1, "TAX123");

        vm.prank(companyOwner1);
        uint256 productId = ecommerce.addProduct(companyId, "Producto", "Desc", 100 * 10**6, 50, "hash");

        vm.prank(customer1);
        ecommerce.registerCustomer("Cliente", "cliente@example.com");

        vm.prank(customer1);
        ecommerce.addToCart(productId, 5);

        vm.prank(customer1);
        uint256 invoiceId = ecommerce.createInvoice(customer1, companyId);

        // Aprobar PaymentGateway
        vm.prank(customer1);
        euroToken.approve(address(paymentGateway), 10000 * 10**6);

        // Procesar pago
        vm.prank(customer1);
        bool success = ecommerce.processPayment(invoiceId, "payment_12345");

        assertTrue(success, "Payment should be successful");

        Ecommerce.Invoice memory invoice = ecommerce.getInvoice(invoiceId);
        assertTrue(invoice.isPaid, "Invoice should be paid");
        assertTrue(invoice.paymentTxHash != bytes32(0), "Payment hash should be set");

        console.log("[PASS] Process payment test passed");
    }

    function test_GetInvoicesByCustomer() public {
        // Setup
        vm.prank(companyOwner1);
        uint256 companyId = ecommerce.registerCompany("Tienda", companyOwner1, "TAX123");

        vm.prank(companyOwner1);
        uint256 productId = ecommerce.addProduct(companyId, "Producto", "Desc", 100 * 10**6, 100, "hash");

        vm.prank(customer1);
        ecommerce.registerCustomer("Cliente", "cliente@example.com");

        // Crear dos invoices
        vm.prank(customer1);
        ecommerce.addToCart(productId, 5);
        vm.prank(customer1);
        ecommerce.createInvoice(customer1, companyId);

        vm.prank(customer1);
        ecommerce.addToCart(productId, 3);
        vm.prank(customer1);
        ecommerce.createInvoice(customer1, companyId);

        Ecommerce.Invoice[] memory invoices = ecommerce.getInvoicesByCustomer(customer1);
        assertEq(invoices.length, 2, "Should have 2 invoices");

        console.log("[PASS] Get invoices by customer test passed");
    }

    function test_GetInvoicesByCompany() public {
        // Setup
        vm.prank(companyOwner1);
        uint256 companyId = ecommerce.registerCompany("Tienda", companyOwner1, "TAX123");

        vm.prank(companyOwner1);
        uint256 productId = ecommerce.addProduct(companyId, "Producto", "Desc", 100 * 10**6, 100, "hash");

        vm.prank(customer1);
        ecommerce.registerCustomer("Cliente 1", "cliente1@example.com");

        vm.prank(customer2);
        ecommerce.registerCustomer("Cliente 2", "cliente2@example.com");

        // Crear invoices de diferentes clientes
        vm.prank(customer1);
        ecommerce.addToCart(productId, 5);
        vm.prank(customer1);
        ecommerce.createInvoice(customer1, companyId);

        vm.prank(customer2);
        ecommerce.addToCart(productId, 3);
        vm.prank(customer2);
        ecommerce.createInvoice(customer2, companyId);

        Ecommerce.Invoice[] memory invoices = ecommerce.getInvoicesByCompany(companyId);
        assertEq(invoices.length, 2, "Should have 2 invoices");

        console.log("[PASS] Get invoices by company test passed");
    }

    // ============ TESTS DE VALIDACIONES ============

    function test_CannotAddToCartWithInsufficientStock() public {
        vm.prank(companyOwner1);
        uint256 companyId = ecommerce.registerCompany("Tienda", companyOwner1, "TAX123");

        vm.prank(companyOwner1);
        uint256 productId = ecommerce.addProduct(companyId, "Producto", "Desc", 100 * 10**6, 10, "hash");

        vm.prank(customer1);
        vm.expectRevert("Ecommerce: insufficient stock");
        ecommerce.addToCart(productId, 15);

        console.log("[PASS] Cannot add to cart with insufficient stock test passed");
    }

    function test_CannotCreateInvoiceWithEmptyCart() public {
        vm.prank(companyOwner1);
        uint256 companyId = ecommerce.registerCompany("Tienda", companyOwner1, "TAX123");

        vm.prank(customer1);
        ecommerce.registerCustomer("Cliente", "cliente@example.com");

        vm.prank(customer1);
        vm.expectRevert("Ecommerce: cart is empty");
        ecommerce.createInvoice(customer1, companyId);

        console.log("[PASS] Cannot create invoice with empty cart test passed");
    }

    function test_CannotCreateInvoiceWithInsufficientStock() public {
        vm.prank(companyOwner1);
        uint256 companyId = ecommerce.registerCompany("Tienda", companyOwner1, "TAX123");

        vm.prank(companyOwner1);
        uint256 productId = ecommerce.addProduct(companyId, "Producto", "Desc", 100 * 10**6, 5, "hash");

        vm.prank(customer1);
        ecommerce.registerCustomer("Cliente", "cliente@example.com");

        // customer1 agrega 3 unidades al carrito (todavía hay stock: 5)
        vm.prank(customer1);
        ecommerce.addToCart(productId, 3);

        // Otro cliente compra 3 unidades (quedan 2 disponibles, pero customer1 tiene 3 en el carrito)
        vm.prank(customer2);
        ecommerce.registerCustomer("Cliente 2", "cliente2@example.com");
        vm.prank(customer2);
        ecommerce.addToCart(productId, 3);
        vm.prank(customer2);
        ecommerce.createInvoice(customer2, companyId);

        // customer1 intenta crear invoice, pero tiene 3 en el carrito y solo quedan 2 disponibles
        vm.prank(customer1);
        vm.expectRevert("Ecommerce: insufficient stock");
        ecommerce.createInvoice(customer1, companyId);

        console.log("[PASS] Cannot create invoice with insufficient stock test passed");
    }

    function test_CannotProcessPaymentTwice() public {
        // Setup
        vm.prank(companyOwner1);
        uint256 companyId = ecommerce.registerCompany("Tienda", companyOwner1, "TAX123");

        vm.prank(companyOwner1);
        uint256 productId = ecommerce.addProduct(companyId, "Producto", "Desc", 100 * 10**6, 50, "hash");

        vm.prank(customer1);
        ecommerce.registerCustomer("Cliente", "cliente@example.com");

        vm.prank(customer1);
        ecommerce.addToCart(productId, 5);
        vm.prank(customer1);
        uint256 invoiceId = ecommerce.createInvoice(customer1, companyId);

        vm.prank(customer1);
        euroToken.approve(address(paymentGateway), 10000 * 10**6);

        // Primer pago (exitoso)
        vm.prank(customer1);
        ecommerce.processPayment(invoiceId, "payment_11111");

        // Segundo pago (debe fallar)
        vm.prank(customer1);
        vm.expectRevert("Ecommerce: invoice already paid");
        ecommerce.processPayment(invoiceId, "payment_22222");

        console.log("[PASS] Cannot process payment twice test passed");
    }

    // ============ TESTS DE FLUJO COMPLETO ============

    function test_FullFlow_AddToCart_CreateInvoice_Pay() public {
        // 1. Registrar empresa
        vm.prank(companyOwner1);
        uint256 companyId = ecommerce.registerCompany("Mi Tienda", companyOwner1, "TAX123");

        // 2. Agregar productos
        vm.prank(companyOwner1);
        uint256 productId1 = ecommerce.addProduct(companyId, "Producto A", "Desc A", 100 * 10**6, 50, "hash1");

        vm.prank(companyOwner1);
        uint256 productId2 = ecommerce.addProduct(companyId, "Producto B", "Desc B", 200 * 10**6, 30, "hash2");

        // 3. Registrar cliente
        vm.prank(customer1);
        ecommerce.registerCustomer("Juan Perez", "juan@example.com");

        // 4. Agregar productos al carrito
        vm.prank(customer1);
        ecommerce.addToCart(productId1, 2);  // 2 * 100 = 200

        vm.prank(customer1);
        ecommerce.addToCart(productId2, 3);  // 3 * 200 = 600

        // 5. Verificar total del carrito
        uint256 cartTotal = ecommerce.getCartTotal(customer1);
        assertEq(cartTotal, 800 * 10**6, "Cart total should be 800 EURT");

        // 6. Crear invoice
        vm.prank(customer1);
        uint256 invoiceId = ecommerce.createInvoice(customer1, companyId);

        Ecommerce.Invoice memory invoice = ecommerce.getInvoice(invoiceId);
        assertEq(invoice.totalAmount, 800 * 10**6, "Invoice total should be 800 EURT");
        assertEq(invoice.items.length, 2, "Invoice should have 2 items");

        // 7. Verificar que el stock se redujo
        Ecommerce.Product memory product1 = ecommerce.getProduct(productId1);
        assertEq(product1.stock, 48, "Product 1 stock should be 48");

        Ecommerce.Product memory product2 = ecommerce.getProduct(productId2);
        assertEq(product2.stock, 27, "Product 2 stock should be 27");

        // 8. Aprobar PaymentGateway
        vm.prank(customer1);
        euroToken.approve(address(paymentGateway), 10000 * 10**6);

        // 9. Procesar pago
        vm.prank(customer1);
        bool success = ecommerce.processPayment(invoiceId, "payment_complete_123");

        assertTrue(success, "Payment should be successful");

        // 10. Verificar que la invoice está pagada
        invoice = ecommerce.getInvoice(invoiceId);
        assertTrue(invoice.isPaid, "Invoice should be paid");

        console.log("[PASS] Full flow test passed");
    }

    // ============ TESTS DE PERMISOS ============

    function test_OnlyCompanyOwnerCanAddProducts() public {
        vm.prank(companyOwner1);
        uint256 companyId = ecommerce.registerCompany("Tienda", companyOwner1, "TAX123");

        vm.prank(nonOwner);
        vm.expectRevert("Ecommerce: only company owner can add products");
        ecommerce.addProduct(companyId, "Producto", "Desc", 100 * 10**6, 50, "hash");

        console.log("[PASS] Only company owner can add products test passed");
    }

    function test_OnlyCompanyOwnerCanUpdateProducts() public {
        vm.prank(companyOwner1);
        uint256 companyId = ecommerce.registerCompany("Tienda", companyOwner1, "TAX123");

        vm.prank(companyOwner1);
        uint256 productId = ecommerce.addProduct(companyId, "Producto", "Desc", 100 * 10**6, 50, "hash");

        vm.prank(nonOwner);
        vm.expectRevert("Ecommerce: only company owner can update products");
        ecommerce.updateProduct(productId, 150 * 10**6, 75);

        console.log("[PASS] Only company owner can update products test passed");
    }
}

