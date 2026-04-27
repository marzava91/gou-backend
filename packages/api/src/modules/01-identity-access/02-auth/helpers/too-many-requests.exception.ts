import { HttpException, HttpStatus } from '@nestjs/common';

export class TooManyRequestsException extends HttpException {
  constructor(response: {
    code: string;
    message: string;
    statusCode: number;
  }) {
    super(response, HttpStatus.TOO_MANY_REQUESTS);
  }
}