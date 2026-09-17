export class StylingError extends Error {
  constructor(
    message: string,
    public readonly code: string,
  ) {
    super(message);
    this.name = 'StylingError';
  }
}

export class InvalidStylingRequestError extends StylingError {
  constructor(message = '잘못된 스타일링 요청입니다.') {
    super(message, 'INVALID_REQUEST');
  }
}

export class GenerationUnavailableError extends StylingError {
  constructor(message = '이미지 생성 서비스를 사용할 수 없습니다.') {
    super(message, 'GENERATION_UNAVAILABLE');
  }
}

export class GenerationFailedError extends StylingError {
  constructor(message = '이미지 생성에 실패했습니다.') {
    super(message, 'GENERATION_FAILED');
  }
}
