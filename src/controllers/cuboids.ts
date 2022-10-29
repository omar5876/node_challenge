import { Request, Response } from 'express';
import * as HttpStatus from 'http-status-codes';
import { Id } from 'objection';
import { Bag, Cuboid } from '../models';

export const list = async (req: Request, res: Response): Promise<Response> => {
  const ids = req.query.ids as Id[];
  const cuboids = await Cuboid.query().findByIds(ids).withGraphFetched('bag');

  return res.status(200).json(cuboids);
};

export const get = async (req: Request, res: Response): Promise<Response> => {
  const cuboidFound = await Cuboid.query().findById(req.params.id);
  if (!cuboidFound) {
    return res.sendStatus(HttpStatus.NOT_FOUND);
  }
  return res.status(HttpStatus.OK).json(cuboidFound);
};

export const create = async (
  req: Request,
  res: Response
): Promise<Response> => {
  const { width, height, depth, bagId } = req.body;
  const bagFound = await Bag.query()
    .findById(bagId)
    .withGraphFetched('cuboids');
  if (!bagFound) {
    return res.sendStatus(HttpStatus.NOT_FOUND);
  }
  const volume = width * height * depth;
  if (bagFound.availableVolume < volume) {
    return res
      .status(HttpStatus.UNPROCESSABLE_ENTITY)
      .json({ message: 'Insufficient capacity in bag' });
  }
  const cuboid = await Cuboid.query().insert({
    width,
    height,
    depth,
    bagId,
  });

  return res.status(HttpStatus.CREATED).json(cuboid);
};

export const updateCuboid = async (
  req: Request,
  res: Response
): Promise<Response> => {
  const { width, height, depth } = req.body;
  const cuboidFound = await Cuboid.query()
    .findById(req.params.id)
    .withGraphFetched('bag');
  if (!cuboidFound) {
    return res.status(HttpStatus.NOT_FOUND).json('cuboid not found');
  }

  const volume = cuboidFound.volume;

  cuboidFound.width = width;
  cuboidFound.height = height;
  cuboidFound.depth = depth;

  const bagFound = await Bag.query()
    .findById(cuboidFound.bag.id)
    .withGraphFetched('cuboids');

  const diff = cuboidFound.volume - volume;

  if (!bagFound || bagFound.availableVolume < diff) {
    return res.sendStatus(HttpStatus.UNPROCESSABLE_ENTITY);
  }

  const cuboidUpdated = await Cuboid.query()
    .updateAndFetchById(req.params.id, { width, height, depth })
    .withGraphFetched('bag');
  return res.status(HttpStatus.OK).json(cuboidUpdated);
};

export const deleteCuboid = async (
  req: Request,
  res: Response
): Promise<Response> => {
  const cuboidFound = await Cuboid.query().findById(req.params.id);

  if (!cuboidFound) {
    return res.sendStatus(HttpStatus.NOT_FOUND);
  }

  await cuboidFound.$query().deleteById(req.params.id);

  return res.sendStatus(HttpStatus.OK);
};
