import type { Request, Response } from "express";
import {
  createLocationRequestSchema,
  locationSchema,
  updateLocationRequestSchema,
} from "@feedback-platform/shared";
import { Location } from "../models/location.js";

function toLocationResponse(location: {
  _id: { toString(): string };
  name: string;
  address?: string | null;
  labels?: string[] | null;
  googlePlaceId?: string | null;
  assigneeUserIds?: string[] | null;
}) {
  return locationSchema.parse({
    id: location._id.toString(),
    name: location.name,
    address: location.address ?? null,
    labels: location.labels ?? [],
    googlePlaceId: location.googlePlaceId ?? null,
    assigneeUserIds: location.assigneeUserIds ?? [],
  });
}

export function createLocationRoutes() {
  return {
    async list(req: Request, res: Response) {
      const locations = await Location.find({ tenantId: req.tenant!.id }).sort({
        name: 1,
      });
      res.json(locations.map(toLocationResponse));
    },

    async create(req: Request, res: Response) {
      const input = createLocationRequestSchema.parse(req.body);
      const location = await Location.create({
        tenantId: req.tenant!.id,
        name: input.name,
        address: input.address,
        labels: input.labels ?? [],
      });
      res.status(201).json(toLocationResponse(location));
    },

    async update(req: Request, res: Response) {
      const input = updateLocationRequestSchema.parse(req.body);
      const location = await Location.findOne({
        _id: req.params.locationId,
        tenantId: req.tenant!.id,
      });
      if (!location) {
        res.status(404).json({ error: "Location not found" });
        return;
      }

      if (input.name !== undefined) location.name = input.name;
      if (input.address !== undefined) location.address = input.address;
      if (input.labels !== undefined) location.labels = input.labels;
      if (input.googlePlaceId !== undefined) {
        location.googlePlaceId = input.googlePlaceId ?? undefined;
      }
      if (input.assigneeUserIds !== undefined) {
        location.assigneeUserIds = input.assigneeUserIds;
      }

      await location.save();
      res.json(toLocationResponse(location));
    },
  };
}
