import prisma from "../lib/prisma.js";
import { Prisma } from "@prisma/client";

// Bütün kredit müddətlərini əldə et
export const getAllCreditTerms = async (req, res) => {
    try {
        const terms = await prisma.creditterm.findMany({
            where: {
                isActive: true
            },
            orderBy: {
                months: 'asc'
            }
        });
        return res.status(200).json({
            success: true,
            date: terms
        });
    } catch (error) {
        console.error("getAllCreditTerms error", error);
        return res.status(500).json({
            success: false,
            message: "Kredit müddətləri alınarkən xəta baş verdi"
        });
    }
};

// Kredit müddəti yarat
export const createCreditTerm = async (req, res) => {
    try {
        const { months, interestRate, description } = req.body;

        if (!months || !interestRate) {
            return res.status(400).json({
                success: false,
                message: "Müddət (ay) və faiz tələb olunur"
            });
        }

        const term = await prisma.creditterm.create({
            data: {
                months: parseInt(months),
                interestRate: new Prisma.Decimal(interestRate),
                description: description?.trim() || null,
                isActive: true
            }
        });

        return res.status(201).json({
            success: true,
            date: term
        });
    } catch (error) {
        console.error("createCreditTerm error", error);
        if (error.code === 'P2002') {
            return res.status(400).json({
                success: false,
                message: "Bu müddət üçün kredit term artıq mövcuddur"
            });
        }
        return res.status(500).json({
            success: false,
            message: "Kredit müddəti yaradılarkən xəta baş verdi"
        });
    }
};

// Kredit müddətini yenilə
export const updateCreditTerm = async (req, res) => {
    try {
        const { id } = req.params;
        const { months, interestRate, description, isActive } = req.body;

        const term = await prisma.creditterm.update({
            where: { id },
            data: {
                ...(months !== undefined && { months: parseInt(months) }),
                ...(interestRate !== undefined && { interestRate: new Prisma.Decimal(interestRate) }),
                ...(description !== undefined && { description: description?.trim() || null }),
                ...(isActive !== undefined && { isActive: isActive })
            }
        });

        return res.status(200).json({
            success: true,
            date: term
        });
    } catch (error) {
        console.error("updateCreditTerm error", error);
        return res.status(500).json({
            success: false,
            message: "Kredit müddəti yenilənərkən xəta baş verdi"
        });
    }
};

// Kredit müddətini sil
export const deleteCreditTerm = async (req, res) => {
    try {
        const { id } = req.params;

        await prisma.creditterm.delete({
            where: { id }
        });

        return res.status(200).json({
            success: true,
            message: "Kredit müddəti silindi"
        });
    } catch (error) {
        console.error("deleteCreditTerm error", error);
        return res.status(500).json({
            success: false,
            message: "Kredit müddəti silinərkən xəta baş verdi"
        });
    }
};

