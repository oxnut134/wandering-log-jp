"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { signIn } from "next-auth/react"; 
import { useRouter } from "next/navigation";
import { useAppContext } from "@/app/context/AppContext";
import Header from "../components/Header"; 

export default function LoginForm({ showDemo }: { showDemo: boolean }) {
    const [executing, setExecuting] = useState(false);
    const [error, setError] = useState("");
    const [demoError, setDemoError] = useState("");
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

    // デモユーザーとしてログイン（認証情報はサーバー側の demo プロバイダーが持つ）
    const handleDemoLogin = async () => {
        if (executing) return;
        setExecuting(true);
        setError("");
        setDemoError("");

        try {
            const result = await signIn("demo", { redirect: false });

            if (result?.ok && !result?.error) {
                setCurrentPage("map");
                router.push("/");
            } else {
                setDemoError("デモにログインできませんでした。時間をおいてもう一度お試しください。");
            }
        } catch (err) {
            console.error("デモログイン失敗:", err);
            setDemoError("通信エラーが発生しました。");
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

                    {showDemo && (
                        <div className="mt-10 flex flex-col gap-y-3">
                            <div className="flex items-center gap-x-3 text-gray-400 text-xs">
                                <span className="flex-1 border-t border-gray-300"></span>
                                または
                                <span className="flex-1 border-t border-gray-300"></span>
                            </div>
                            <button
                                type="button"
                                onClick={handleDemoLogin}
                                disabled={executing}
                                className={`w-full py-3 rounded-lg font-bold border-2 transition-colors ${executing ? "border-gray-300 text-gray-400" : "border-[#388778] text-[#388778] hover:bg-[#388778] hover:text-white"
                                    }`}
                            >
                                {executing ? "認証中..." : "デモアカウントでログイン"}
                            </button>
                            <p className="text-center text-gray-500 text-xs">登録なしで、サンプルの記録が入ったデモを試せます</p>
                            {demoError && <p className="text-red-500 text-sm">{demoError}</p>}
                        </div>
                    )}

                    <p className="mt-12 text-center text-gray-400 text-xs">
                        © 2026 Your Wandering Log
                    </p>
                </div>
            </div>
        </>
    );
}
