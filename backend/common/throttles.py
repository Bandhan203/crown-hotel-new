from rest_framework.throttling import AnonRateThrottle


class ContactFormThrottle(AnonRateThrottle):
    rate = '5/hour'
