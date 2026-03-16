import { Request, Response } from 'express';
import { UsersService } from './users.service';

export class UsersController {
  private usersService: UsersService;

  constructor() {
    this.usersService = new UsersService();
  }

  async findAll(req: Request, res: Response) {
    try {
      const result = await this.usersService.findAll();
      res.json(result);
    } catch (error) {
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  async findOne(req: Request, res: Response) {
    try {
      const result = await this.usersService.findOne(req.params.id);
      res.json(result);
    } catch (error: any) {
      if (error.message === 'User not found') res.status(404).json({ error: error.message });
      else res.status(500).json({ error: 'Internal server error' });
    }
  }

  async create(req: Request, res: Response) {
    try {
      const result = await this.usersService.create(req.body);
      res.status(201).json(result);
    } catch (error: any) {
      if (error.message === 'Email already in use') res.status(400).json({ error: error.message });
      else res.status(500).json({ error: 'Internal server error' });
    }
  }

  async update(req: Request, res: Response) {
    try {
      const result = await this.usersService.update(req.params.id, req.body);
      res.json(result);
    } catch (error: any) {
      res.status(500).json({ error: 'Internal server error' });
    }
  }
}
