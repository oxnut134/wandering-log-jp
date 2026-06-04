"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { signIn } from "next-auth/react"; 
import { useRouter } from "next/navigation";
import { useAppContext } from "@/app/context/AppContext";
import Header from "../components/Header"; 

export default function LoginPage() {
    const [executing, setExecuting] = useState(false);
    const [error, setError] = useState("");
    const router = useRouter();
    const { currentPage, setCurrentPage } = useAppContext();
    const { register, handleSubmit, formState: { errors } } = useForm();


    useEffect(() => {
        setCurrentPage("login");
    }, []);


    const handleLogin = async (data: any) => {
        if (executing) return;
        setExecuting(true);
        setError("");

        try {
            const result = await signIn("credentials", {
                redirect: false, 
                email: data.email,
                password: data.password,
            });

            if (result?.ok  && !result?.error) {
                setCurrentPage("map");
                router.push("/");
            } else {
                setError("メールアドレスまたはパスワードが正しくありません。");
            }
        } catch (err: any) {
            console.error("ログイン失敗:", err);
            setError("通信エラーが発生しました。");
        } finally {
            setExecuting(false);
        }
    };
    return (
        <>
            <div className="p-6 mt-6 w-md mx-auto bg-zinc-50 ">
                <Header />
                <div className="p-6 max-w-md mx-auto">
                    <h1 className="text-3xl font-bold mb-8 text-[#388778] text-center">Login</h1>
                    <form onSubmit={handleSubmit(handleLogin)} className="flex flex-col gap-y-12">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1"></label>
                            <input
                                {...register("email", {
                                    required: "メールは必須です",
                                    pattern: { value: /^\S+@\S+$/i, message: "メールの形式が正しくありません" }
                                })}
                                type="email"
                                className="w-full border border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-orange-500 outline-none"
                                placeholder="メールアドレス"
                            />
                            {errors.email && <p className="text-red-500 text-xs mt-1">{String(errors.email.message)}</p>}
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1"></label>
                            <input
                                type="password"
                                {...register("password", {
                                    required: "パスワードは必須です",
                                    minLength: { value: 8, message: "8文字以上必要です" }
                                })}
                                className="w-full border border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-orange-500 outline-none"
                                placeholder="パスワード"
                            />
                            {errors.password && <p className="text-red-500 text-xs mt-1">{String(errors.password.message)}</p>}
                        </div>

                        {error && <p className="text-red-500 text-sm">{error}</p>}

                        <button
                            type="submit"
                            disabled={executing}
                            className={`w-full py-3 rounded-lg font-bold text-white transition-colors ${executing ? "bg-gray-400" : "bg-[#388778] hover:bg-orange-600"
                                }`}
                        >
                            {executing ? "認証中..." : "ログイン"}
                        </button>
                    </form>

                    <p className="mt-12 text-center text-gray-400 text-xs">
                        © 2026 Your Shopping System
                    </p>
                </div>
            </div>
        </>
    );
}
