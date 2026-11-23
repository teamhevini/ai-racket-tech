import { Router } from "express";
import { z } from "zod";
import { asyncHandler, currentUser, requireAdmin } from "../auth";
import { storage } from "../storage";
import { parseBody, parseId } from "./util";

export const adminRouter = Router();
adminRouter.use("/api/admin", requireAdmin);

adminRouter.get(
  "/api/admin/users",
  asyncHandler(async (_req, res) => {
    const users = await storage.getAllUsers();
    res.json(
      users.map((u) => ({
        id: u.id,
        email: u.email,
        firstName: u.firstName,
        lastName: u.lastName,
        tier: u.tier,
        isAdmin: u.isAdmin,
        hasPassword: !!u.passwordHash,
        createdAt: u.createdAt,
        updatedAt: u.updatedAt,
      })),
    );
  }),
);

adminRouter.patch(
  "/api/admin/users/:id/tier",
  asyncHandler(async (req, res) => {
    const id = parseId(req.params.id);
    const data = parseBody(z.object({ tier: z.enum(["free", "pro", "club"]) }), req.body, res);
    if (!data) return;
    if (!id || !(await storage.getUserById(id))) return res.status(404).json({ message: "User not found" });
    await storage.setUserTier(id, data.tier);
    res.json({ success: true });
  }),
);

adminRouter.patch(
  "/api/admin/users/:id/admin",
  asyncHandler(async (req, res) => {
    const id = parseId(req.params.id);
    const data = parseBody(z.object({ isAdmin: z.boolean() }), req.body, res);
    if (!data) return;
    if (id === currentUser(req).id && !data.isAdmin) {
      return res.status(400).json({ message: "You can't remove your own admin access." });
    }
    if (!id || !(await storage.getUserById(id))) return res.status(404).json({ message: "User not found" });
    await storage.updateUser(id, { isAdmin: data.isAdmin });
    res.json({ success: true });
  }),
);
