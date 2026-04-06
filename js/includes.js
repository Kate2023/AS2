(function () {
    "use strict";

    function setActiveNav() {
        // Determine current page file name
        const path = (location.pathname.split("/").pop() || "index.html").toLowerCase();

        // clear all
        $("[data-nav]").removeClass("active");
        $("[data-nav='cart']").removeClass("active"); // cart is a button

        // apply active by page
        if (path === "index.html" || path === "") {
            $("[data-nav='home']").addClass("active");
            // show the home search only on index (optional)
            $("#homeSearchForm").removeClass("d-none");
        } else if (path === "shop.html" || path === "product.html") {
            $("[data-nav='shop']").addClass("active");
        } else if (path === "cart.html" || path === "shipping.html" || path === "payment.html") {
            $("[data-nav='cart']").addClass("active");
        }
    }

    $(function () {
        const headerDone = $.Deferred();
        const footerDone = $.Deferred();

        $("#siteHeader").load("partials/header.html", function () {
            headerDone.resolve();
        });

        $("#siteFooter").load("partials/footer.html", function () {
            footerDone.resolve();
        });

        // When header/footer are injected, then apply active states
        $.when(headerDone, footerDone).done(function () {
            setActiveNav();
        });
    });
})();