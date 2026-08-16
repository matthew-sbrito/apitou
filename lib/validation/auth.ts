import { z } from "zod";

export const loginSchema = z.object({
  email: z.email({ error: "Digite um e-mail válido." }),
  password: z.string().min(1, { error: "Digite sua senha." }),
});

export const signupSchema = z.object({
  name: z.string().trim().min(2, { error: "Seu nome precisa de pelo menos 2 letras." }),
  email: z.email({ error: "Digite um e-mail válido." }),
  password: z
    .string()
    .min(8, { error: "A senha precisa ter pelo menos 8 caracteres." }),
});

export type LoginInput = z.infer<typeof loginSchema>;
export type SignupInput = z.infer<typeof signupSchema>;
