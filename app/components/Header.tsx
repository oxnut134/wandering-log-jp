
"use client";

import { useSession, signOut } from "next-auth/react";
import { useAppContext } from "@/app/context/AppContext";
import { usePathname } from "next/navigation";

export default function Header(isDesktop: any) {
    const { data: session } = useSession();
    const { currentPage, setCurrentPage } = useAppContext();
    const pathname = usePathname();

    const userName = session?.user?.name || null;

    const handleLogout = async () => {
        await signOut({ callbackUrl: "/login" });
    };

    const isMapPage = pathname === "/";
    return (
        <>
            <div
                style={{ zIndex: 1000 }}
                className={`${isMapPage ? "w-full h-auto mt-0 pt-1 rounded-sm ml-5" : "w-full h-auto mt-0 py-0"
                    } flex flex-col items-center justify-center bg-white border border-3 border-[#388778] px-1 shadow-sm mb-0 transition-all duration-200 `}
            >

                {/*{userName && (
                    <div className="w-full text-left pl-[5%] text-[9px] text-zinc-400 leading-none mb-0.5 pl-0.5">
                        Logged in as: <span className="text-[12px] text-orange-600 font-bold">{userName}</span>
                    </div>
                )}*/}
                <div className={`w-full text-left pl-[5%] text-[9px] text-zinc-400 leading-none mb-0.5 pl-0.5 ${currentPage === "login" || currentPage === "register" || !userName ? "invisible" : ""}`}>
                    Logged in as: <span className="text-[12px] text-orange-600 font-bold">{userName}</span>
                </div>
                <div className="w-[95%] flex items-center justify-between gap-0 mt-1 mb-1 py-0">
                    <img
                        src="/sdesign_00053.png"
                        alt="買い物かご"
                        className="w-[8%] aspect-square rounded-full "
                    />
                    <span className="text-full text-left w-[65%] text-[25px] italic text-[#388778] font-black tracking-wider text-center">
                        Wandering Log
                    </span>

                    <div className="w-[20%]  text-[15px] font-bold text-gray-500 text-right">
                        {currentPage === "login" && (
                            <button onClick={() => window.location.href = "/register"} className="hover:text-red-500 font-black transition-colors">新規登録</button>
                        )}
                        {currentPage === "register" && (
                            <button onClick={() => window.location.href = "/login"} className="hover:text-red-500 font-black transition-colors">ログイン</button>
                        )}
                        {pathname === "/" && (
                            <button onClick={handleLogout} className="hover:text-red-500 font-black transition-colors">
                                ログアウト
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </>
    );
}
