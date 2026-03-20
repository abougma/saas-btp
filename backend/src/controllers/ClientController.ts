import { Request, Response, NextFunction } from 'express';
import { clientService } from '../services/ClientService.js';
import { ClientNotFoundError, ClientConflictError } from '../services/ClientService.js';

function handleServiceError(error: unknown, res: Response, next: NextFunction): void {
  if (error instanceof ClientNotFoundError) {
    res.status(404).json({ success: false, error: { code: error.code, message: error.message } });
    return;
  }
  if (error instanceof ClientConflictError) {
    res.status(409).json({ success: false, error: { code: error.code, message: error.message } });
    return;
  }
  next(error);
}

export class ClientController {
  async list(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Authentification requise' } });
        return;
      }
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;
      const { clients, total } = await clientService.listClients(req.user.organizationId.toString(), { page, limit });
      res.json({ success: true, data: clients, meta: { page, limit, total, totalPages: Math.ceil(total / limit) } });
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
      const client = await clientService.getClientById(req.user.organizationId.toString(), req.params.id);
      res.json({ success: true, data: client });
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
      const client = await clientService.createClient(req.user.organizationId.toString(), req.body);
      res.status(201).json({ success: true, data: client });
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
      const client = await clientService.updateClient(req.user.organizationId.toString(), req.params.id, req.body);
      res.json({ success: true, data: client });
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
      await clientService.deleteClient(req.user.organizationId.toString(), req.params.id);
      res.json({ success: true });
    } catch (error) {
      handleServiceError(error, res, next);
    }
  }
}

export const clientController = new ClientController();
export default clientController;
