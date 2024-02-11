import { clerkClient } from "@clerk/nextjs";
import { User } from "@clerk/nextjs/server";
import { TRPCError } from "@trpc/server";
import { z } from "zod";

import { createTRPCRouter, privateProcedure, publicProcedure } from "~/server/api/trpc";

const fileterUserForClient = (user: User) => {
    return {
        id: user.id,
        username: user.username,
        imageUrl: user.imageUrl,
    };
}

export const moleculeRouter = createTRPCRouter({
    getAll: publicProcedure.query(async ({ ctx }) => {
        const molecules = await ctx.db.molecularRecord.findMany({
            orderBy: { createdAt: "desc" },
            take: 100,
        });

        const users = (
            await clerkClient.users.getUserList({
                userId: molecules.map((molecule) => molecule.authorId),
                limit: 100,
            })
        ).map(fileterUserForClient);

        return molecules.map((molecule) => {
            const author = users.find((user) => user.id === molecule.authorId);

            if (!author || !author.username)
                throw new TRPCError({
                    code: "INTERNAL_SERVER_ERROR",
                    message: "Author not found",
                });

            return {
                molecule,
                author,
            };
        });
    }),

    create: privateProcedure
        .input(
            z.object({
                chemicalFormula: z.string().min(1).max(1000),
                chemicalName: z.string().min(1).max(1000),
                materialName: z.string().min(1).max(1000),
                solvent: z.string().min(1).max(1000),
                concentration: z.string().min(1).max(1000),
                temperature: z.string().min(1).max(1000),
                depositionTime: z.string().min(1).max(1000),
                spinSpeed: z.string().min(1).max(1000),
                vendorName: z.string().min(1).max(1000),

                // Experimental Conditions
                absorbtionEdge: z.string().min(1).max(1000),
                lab: z.string().min(1).max(1000),
                scanMode: z.string().min(1).max(1000),

            })
        ).mutation(async ({ ctx, input }) => {
            const authorId = ctx.currentUser;

            const molecule = await ctx.db.molecularRecord.create({
                data: {
                    ...input,
                    authorId,
                },
            })

            return molecule;
        })
});
