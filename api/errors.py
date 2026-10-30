from typing import Any, Dict
from fastapi import Request
from fastapi.responses import JSONResponse


class APIException(Exception):
    def __init__(self, status_code: int, code: str, message: str, retryable: bool = False):
        self.status_code = status_code
        self.code = code
        self.message = message
        self.retryable = retryable
        super().__init__(message)

    def to_dict(self) -> Dict[str, Any]:
        # SEC-002: Never echo patient fields in error bodies
        return {
            "code": self.code,
            "message": self.message,
            "retryable": self.retryable,
        }


def api_exception_handler(request: Request, exc: APIException) -> JSONResponse:
    return JSONResponse(
        status_code=exc.status_code,
        content=exc.to_dict(),
    )

