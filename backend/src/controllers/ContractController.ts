import { Request, Response, NextFunction } from 'express';
import { contractService } from '../services/ContractService.js';
import { ContractStatus } from '../types/index.js';
import { ContractNotFoundError, ContractConflictError, ContractValidationError } from '../services/ContractService.js';

function handleServiceError(error: unknown, res: Response, next: NextFunction): void {
  if (error instanceof ContractNotFoundError) {
    res.status(404).json({ success: false, error: { code: error.code, message: error.message } });
    return;
  }
  if (error instanceof ContractConflictError) {
    res.status(409).json({ success: false, error: { code: error.code, message: error.message } });
    return;
  }
  if (error instanceof ContractValidationError) {
    res.status(400).json({ success: false, error: { code: error.code, message: error.message } });
    return;
  }
  next(error);
}

export class ContractController {
  async list(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Authentification requise' } });
        return;
      }
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;
      const status = req.query.status as ContractStatus | undefined;
      const { contracts, total } = await contractService.listContracts(req.user.organizationId.toString(), { page, limit, status });
      res.json({ success: true, data: contracts, meta: { page, limit, total, totalPages: Math.ceil(total / limit) } });
    } catch (error) {
      next(error);
    }
  }

  async getOne(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Authentification requise' } });
        return;
      }
      const contract = await contractService.getContractById(req.user.organizationId.toString(), req.params.id);
      res.json({ success: true, data: contract });
    } catch (error) {
      handleServiceError(error, res, next);
    }
  }

  async create(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Authentification requise' } });
        return;
      }
      const contract = await contractService.createContract(req.user.organizationId.toString(), req.body);
      res.status(201).json({ success: true, data: contract });
    } catch (error) {
      handleServiceError(error, res, next);
    }
  }

  async update(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Authentification requise' } });
        return;
      }
      const contract = await contractService.updateContract(req.user.organizationId.toString(), req.params.id, req.body);
      res.json({ success: true, data: contract });
    } catch (error) {
      handleServiceError(error, res, next);
    }
  }

  async remove(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Authentification requise' } });
        return;
      }
      await contractService.deleteContract(req.user.organizationId.toString(), req.params.id);
      res.json({ success: true });
    } catch (error) {
      handleServiceError(error, res, next);
    }
  }
}

export const contractController = new ContractController();
export default contractController;
