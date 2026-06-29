from django.urls import path

from . import checkout_views, registration_views, views

urlpatterns = [
    # Public
    path('check-availability/', views.CheckAvailabilityView.as_view(), name='check-availability'),
    path('rate-plans/available/', views.PublicRatePlanListView.as_view(), name='public-rate-plans'),
    # Guest
    path('bookings/', views.CreateBookingView.as_view(), name='create-booking'),
    path('bookings/my/', views.MyBookingsListView.as_view(), name='my-bookings'),
    path('bookings/my/<int:pk>/', views.MyBookingDetailView.as_view(), name='my-booking-detail'),
    path('bookings/my/<int:pk>/cancel/', views.CancelBookingView.as_view(), name='cancel-booking'),
    path('bookings/my/<int:pk>/invoice/', views.GuestInvoiceView.as_view(), name='guest-invoice'),
    path('bookings/my/<int:pk>/invoice/pdf/', views.GuestInvoicePDFView.as_view(), name='guest-invoice-pdf'),
    # Admin — bookings
    path('admin/bookings/', views.AdminBookingListView.as_view(), name='admin-booking-list'),
    path('admin/bookings/create/', views.AdminCreateBookingView.as_view(), name='admin-booking-create'),
    path('admin/bookings/<int:pk>/', views.AdminBookingDetailView.as_view(), name='admin-booking-detail'),
    path('admin/bookings/<int:pk>/edit/', views.AdminUpdateBookingView.as_view(), name='admin-booking-update'),
    path('admin/bookings/<int:pk>/delete/', views.AdminDeleteBookingView.as_view(), name='admin-booking-delete'),
    path('admin/bookings/<int:pk>/status/', views.AdminBookingStatusView.as_view(), name='admin-booking-status'),
    path('admin/bookings/<int:pk>/assign-room/', views.AdminAssignRoomView.as_view(), name='admin-booking-assign-room'),
    path('admin/bookings/<int:booking_id>/payments/', views.AdminPaymentCreateView.as_view(), name='admin-payment-create'),
    path('admin/bookings/<int:pk>/folio/', views.FolioListCreateView.as_view(), name='admin-folio'),
    path('admin/bookings/<int:pk>/invoice/', views.InvoiceView.as_view(), name='admin-invoice'),
    path('admin/bookings/<int:pk>/invoice/pdf/', views.InvoicePDFView.as_view(), name='admin-invoice-pdf'),
    # Admin — payments
    path('admin/payments/', views.AdminPaymentListView.as_view(), name='admin-payment-list'),
    # Admin — reservations (front desk)
    path('admin/reservations/create/', views.ReservationCreateView.as_view(), name='reservation-create'),
    path('admin/reservations/<int:pk>/finalize/', views.ReservationFinalizeView.as_view(), name='reservation-finalize'),
    path('admin/reservations/<int:pk>/confirmation/pdf/', views.ReservationConfirmationPDFView.as_view(), name='reservation-confirmation-pdf'),
    path('admin/reservations/walk-in/', views.WalkInBookingView.as_view(), name='walk-in-booking'),
    path('admin/reservations/<int:pk>/check-in/', views.CheckInView.as_view(), name='check-in'),
    path('admin/reservations/<int:pk>/check-out/', views.CheckOutView.as_view(), name='check-out'),
    # Admin — checkout module (Revenue Guard)
    path('admin/checkout/lookup/', checkout_views.CheckoutLookupView.as_view(), name='checkout-lookup'),
    path('admin/checkout/companies/', checkout_views.CheckoutCompaniesView.as_view(), name='checkout-companies'),
    path('admin/checkout/<int:booking_id>/payment/', checkout_views.CheckoutPaymentView.as_view(), name='checkout-payment'),
    path('admin/checkout/<int:booking_id>/execute/', checkout_views.CheckoutExecuteView.as_view(), name='checkout-execute'),
    path('admin/checkout/<int:booking_id>/invoice-preview/', checkout_views.CheckoutInvoicePreviewView.as_view(), name='checkout-invoice-preview'),
    path('admin/checkout/duplicate-bill/', checkout_views.CheckoutDuplicateBillView.as_view(), name='checkout-duplicate-bill'),
    path('admin/reservations/<int:pk>/no-show/', views.NoShowView.as_view(), name='no-show'),
    path('admin/reservations/arrivals/', views.ArrivalsListView.as_view(), name='arrivals'),
    path('admin/reservations/departures/', views.DeparturesListView.as_view(), name='departures'),
    path('admin/reservations/in-house/', views.InHouseListView.as_view(), name='in-house'),
    path('admin/reservations/calendar/', views.CalendarView.as_view(), name='calendar'),
    path('admin/reservations/available-rooms/', views.AvailableRoomsView.as_view(), name='available-rooms'),
    # Admin — registration
    path('admin/reservations/<int:pk>/registration/', views.GuestRegistrationView.as_view(), name='guest-registration'),
    path('admin/reservations/<int:pk>/registration/check-in/', views.RegistrationCheckInView.as_view(), name='registration-check-in'),
    path('admin/reservations/<int:pk>/registration/pdf/', views.RegistrationCardPDFView.as_view(), name='registration-card-pdf'),
    path('admin/reservations/<int:pk>/registration/upload/', views.RegistrationCardUploadView.as_view(), name='registration-card-upload'),
    # Admin — unified registrations
    path('admin/registrations/', registration_views.RegistrationCreateView.as_view(), name='registration-create'),
    path('admin/registrations/by-booking/<int:booking_id>/', registration_views.RegistrationByBookingView.as_view(), name='registration-by-booking'),
    path('admin/registrations/<int:pk>/', registration_views.RegistrationDetailView.as_view(), name='registration-detail'),
    path('admin/registrations/<int:pk>/check-in/', registration_views.UnifiedRegistrationCheckInView.as_view(), name='unified-registration-check-in'),
    # Admin — folio
    path('admin/folio/<int:charge_id>/void/', views.FolioVoidView.as_view(), name='folio-void'),
    # Admin — rate plans
    path('admin/rate-plans/', views.RatePlanListCreateView.as_view(), name='rate-plan-list'),
    path('admin/rate-plans/<int:pk>/', views.RatePlanDetailView.as_view(), name='rate-plan-detail'),
    # Admin — payment gateway controls
    path('admin/payment-gateway/settings/', views.AdminPaymentGatewaySettingsView.as_view(), name='admin-pg-settings'),
    path('admin/payment-gateway/query/', views.AdminTransactionQueryView.as_view(), name='admin-pg-query'),
    path('admin/payment-gateway/refund/', views.AdminRefundPaymentView.as_view(), name='admin-pg-refund'),
    # SSLCommerz payment gateway
    path('payments/initiate/', views.PaymentInitiateView.as_view(), name='payment-initiate'),
    path('payments/success/', views.PaymentSuccessView.as_view(), name='payment-success'),
    path('payments/fail/', views.PaymentFailView.as_view(), name='payment-fail'),
    path('payments/cancel/', views.PaymentCancelView.as_view(), name='payment-cancel'),
    path('payments/ipn/', views.PaymentIPNView.as_view(), name='payment-ipn'),
    # Admin — Reports
    path('admin/reports/police-export/', views.PoliceExportView.as_view(), name='police-export'),
]
