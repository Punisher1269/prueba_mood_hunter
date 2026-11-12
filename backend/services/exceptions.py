"""Errores de negocio. Los servicios no conocen HTTP; main.py los traduce a códigos de estado."""


class ServiceError(Exception):
    status_code = 400

    def __init__(self, message: str) -> None:
        super().__init__(message)
        self.message = message


class NotFoundError(ServiceError):
    status_code = 404


class InvalidTransitionError(ServiceError):
    status_code = 409


class ValidationError(ServiceError):
    status_code = 422


class SummaryUnavailableError(ServiceError):
    status_code = 503


class SummaryTimeoutError(ServiceError):
    status_code = 504
