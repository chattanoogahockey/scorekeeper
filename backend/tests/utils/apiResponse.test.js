import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { APIResponse, AppError, ValidationError, NotFoundError, ConflictError } from '../src/utils/apiResponse.js';

describe('APIResponse Utility', () => {
  let mockRes;

  beforeEach(() => {
    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis()
    };
  });

  describe('success responses', () => {
    it('should create successful response with data', () => {
      const data = { id: 1, name: 'Test' };
      const message = 'Success';
      
      APIResponse.success(mockRes, data, message);
      
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data,
        message,
        meta: {
          timestamp: expect.any(String),
          requestId: expect.any(String)
        }
      });
    });

    it('should create successful response with custom status code', () => {
      const data = { id: 1 };
      
      APIResponse.success(mockRes, data, 'Created', {}, 201);
      
      expect(mockRes.status).toHaveBeenCalledWith(201);
    });

    it('should include custom metadata', () => {
      const data = { id: 1 };
      const customMeta = { count: 10, page: 1 };
      
      APIResponse.success(mockRes, data, 'Success', customMeta);
      
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data,
        message: 'Success',
        meta: {
          timestamp: expect.any(String),
          requestId: expect.any(String),
          ...customMeta
        }
      });
    });
  });

  describe('error responses', () => {
    it('should create error response', () => {
      const error = new Error('Test error');
      
      APIResponse.error(mockRes, error);
      
      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: {
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Test error'
        },
        meta: {
          timestamp: expect.any(String),
          requestId: expect.any(String)
        }
      });
    });

    it('should handle ValidationError correctly', () => {
      const error = new ValidationError('Invalid input', ['Field required']);
      
      APIResponse.error(mockRes, error);
      
      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid input',
          details: ['Field required']
        },
        meta: {
          timestamp: expect.any(String),
          requestId: expect.any(String)
        }
      });
    });

    it('should handle NotFoundError correctly', () => {
      const error = new NotFoundError('Resource not found');
      
      APIResponse.error(mockRes, error);
      
      expect(mockRes.status).toHaveBeenCalledWith(404);
    });

    it('should handle ConflictError correctly', () => {
      const error = new ConflictError('Resource already exists');
      
      APIResponse.error(mockRes, error);
      
      expect(mockRes.status).toHaveBeenCalledWith(409);
    });
  });
});

describe('Error Classes', () => {
  describe('AppError', () => {
    it('should create AppError with default values', () => {
      const error = new AppError('Test message');
      
      expect(error.message).toBe('Test message');
      expect(error.statusCode).toBe(500);
      expect(error.code).toBe('INTERNAL_SERVER_ERROR');
      expect(error.isOperational).toBe(true);
    });

    it('should create AppError with custom values', () => {
      const error = new AppError('Custom message', 400, 'CUSTOM_ERROR');
      
      expect(error.message).toBe('Custom message');
      expect(error.statusCode).toBe(400);
      expect(error.code).toBe('CUSTOM_ERROR');
    });
  });

  describe('ValidationError', () => {
    it('should create ValidationError with details', () => {
      const details = ['Field required', 'Invalid format'];
      const error = new ValidationError('Validation failed', details);
      
      expect(error.message).toBe('Validation failed');
      expect(error.statusCode).toBe(400);
      expect(error.code).toBe('VALIDATION_ERROR');
      expect(error.details).toEqual(details);
    });
  });

  describe('NotFoundError', () => {
    it('should create NotFoundError correctly', () => {
      const error = new NotFoundError('Resource not found');
      
      expect(error.message).toBe('Resource not found');
      expect(error.statusCode).toBe(404);
      expect(error.code).toBe('NOT_FOUND');
    });
  });

  describe('ConflictError', () => {
    it('should create ConflictError correctly', () => {
      const error = new ConflictError('Resource conflict');
      
      expect(error.message).toBe('Resource conflict');
      expect(error.statusCode).toBe(409);
      expect(error.code).toBe('CONFLICT');
    });
  });
});
