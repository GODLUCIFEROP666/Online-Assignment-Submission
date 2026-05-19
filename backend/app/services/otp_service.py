from random import randint


def generate_otp() -> str:
    return f"{randint(100000, 999999)}"
