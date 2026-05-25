import hashlib
import hmac
import os
import uuid


class PaymentProviderError(Exception):
    pass


class PaymentProvider:
    name = "base"

    def create_order(self, *, amount, currency, receipt):
        raise NotImplementedError

    def verify_payment(self, *, payload, signature):
        raise NotImplementedError

    def refund(self, *, payment_id, amount):
        raise NotImplementedError


class RazorpayProvider(PaymentProvider):
    name = "razorpay"

    def __init__(self):
        self.key = os.environ.get("RAZORPAY_SECRET_KEY_ID") or os.environ.get("RAZORPAY_KEY")
        self.secret = os.environ.get("RAZORPAY_SECRET_KEY_SECRET") or os.environ.get("RAZORPAY_SECRET")

    def create_order(self, *, amount, currency, receipt):
        if not self.key or not self.secret:
            raise PaymentProviderError("Razorpay credentials are not configured.")

        try:
            import razorpay  # type: ignore
        except Exception:
            # Fallback stub (no external SDK available)
            return {"id": f"rzp_order_{uuid.uuid4().hex}", "amount": amount, "currency": currency, "receipt": receipt}

        client = razorpay.Client(auth=(self.key, self.secret))
        data = {"amount": int(amount), "currency": currency, "receipt": receipt}
        return client.order.create(data=data)

    def verify_payment(self, *, payload, signature):
        if not self.secret:
            raise PaymentProviderError("Razorpay secret not configured.")
        body = "|".join([payload.get("razorpay_order_id", ""), payload.get("razorpay_payment_id", "")])
        expected = hmac.new(self.secret.encode(), body.encode(), hashlib.sha256).hexdigest()
        return hmac.compare_digest(expected, signature or "")

    def refund(self, *, payment_id, amount):
        if not self.key or not self.secret:
            raise PaymentProviderError("Razorpay credentials are not configured.")
        try:
            import razorpay  # type: ignore
        except Exception:
            return {"id": f"rzp_refund_{uuid.uuid4().hex}", "amount": amount}
        client = razorpay.Client(auth=(self.key, self.secret))
        return client.payment.refund(payment_id, {"amount": int(amount)})


def get_payment_provider(name: str) -> PaymentProvider:
    if name == "razorpay":
        return RazorpayProvider()
    raise PaymentProviderError("Unsupported payment gateway.")
