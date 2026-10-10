"use client";
import React, { useState, useEffect, useCallback, useRef } from "react";
import { APIProvider } from "@vis.gl/react-google-maps";
import MapContainer from "./components/MapContainer";
import ModalLocation from "./components/ModalLocation";
import ModalGoogle from "./components/ModalGoogle";
import ModalLogs from "./components/ModalLogs";
import ModalComments from "./components/ModalComments";
import Header from "./components/Header";
import ChatWidget from "./components/ChatWidget";

//declare const google: any;

import { useAppContext, AppProvider } from "./context/AppContext";

// 起動時の位置のモード。live: 現在地を取得して起動 / demo: 現在地を取得せず銀座で起動（未設定のときは demo）
const LOCATION_MODE = process.env.NEXT_PUBLIC_LOCATION_MODE === "live" ? "live" : "demo";
const GINZA_POS = { lat: 35.67133, lng: 139.76534 };
const GEOLOCATION_TIMEOUT_MS = 10000;


export default function WanderingLog() {

    const [currentPosOfCamera, setCurrentPosOfCamera] = useState<any>(null);
    const [currentPosOfHome, setCurrentPosOfHome] = useState<any>(null);
    const [redMarkerPos, setRedMarkerPos] = useState<any>(null);
    const [visitedLocations, setVisitedLocations] = useState([]);
    const [homeTrigger, setHomeTrigger] = useState(0);
    const [modalPos, setModalPos] = useState({})
    const [openedModalLocations, setOpenedModalLocations] = useState<any[]>([]);

    const [isGoogleView, setIsGoogleView] = useState(false);
    const [currentZoom, setCurrentZoom] = useState(15);
    const [moveDist, setMoveDist] = useState({ x: 0, y: 0 });
    const [dummy, setDummy] = useState(false);
    const [isCommentRecordExist, setIsCommentRecordExist] = useState(false);
    const [activeGroupId, setActiveGroupId] = useState<number | null>(null);
    const [clickedModalId, setClickedModalId] = useState<number | null>(null)
    const { currentUserId, setCurrentUserId } = useAppContext();
    const [authChecking, setAuthChecking] = useState(true);
    const [initialLocationId, setInitialLocationId] = useState()
    const [onSavingLocation, setOnSavingLocation] = useState(false);
    const [isDesktop, setIsDesktop] = useState(true);
    const [searchKeyword, setSearchKeyword] = useState("");
    const [toastMessage, setToastMessage] = useState<string | null>(null);

    useEffect(() => {
        fetch('/api/auth/session')
            .then((res) => {
                if (!res.ok) throw new Error('Unauthorized');
                return res.json();
            })
            .then((data) => {
                if (data?.user?.name) {
                    setCurrentUserId(data.user.id);
                    setAuthChecking(false);
                } else {
                    window.location.href = "/login";
                }
            })
            .catch((err) => {
                console.error("🚨 認証チェックエラー:", err);
                window.location.href = "/login";
            });
    }, []);

    useEffect(() => {
        const media = window.matchMedia('(min-width: 768px)');

        setIsDesktop(media.matches);

        const listener = (e: MediaQueryListEvent) => {
            setIsDesktop(e.matches);
        };

        media.addEventListener('change', listener);


    }, []);

    const renderMe = () => {
        setDummy(prev => !prev);
    };

    const refreshHistory = async () => {

        const res = await fetch("/api/get_locations_and_places");
        const data = await res.json();
        setVisitedLocations(data);


        setTimeout(() => {
            setCurrentPosOfCamera((prev: any) => {
                if (!prev) return prev;
                return {
                    ...prev,
                    lat: prev.lat + 0.00001,
                    lng: prev.lng + 0.00001
                }
            });
        }, 200);

    };

    useEffect(() => {
        let started = false;
        let timer: ReturnType<typeof setTimeout> | undefined;

        //先に起動した側を採用し、遅れて届いた現在地やエラーは無視する
        const startAt = (coords: { lat: number; lng: number }) => {
            if (started) return;
            started = true;
            setCurrentPosOfCamera(coords);
            setCurrentPosOfHome(coords);
            setRedMarkerPos(coords);
        };

        if (LOCATION_MODE === "live" && navigator.geolocation) {
            //許可ダイアログを放置された場合などに備え、時間切れなら銀座からスタート
            timer = setTimeout(() => startAt(GINZA_POS), GEOLOCATION_TIMEOUT_MS);
            navigator.geolocation.getCurrentPosition(
                (pos) => {
                    clearTimeout(timer);
                    startAt({ lat: pos.coords.latitude, lng: pos.coords.longitude }); //起動後現在地からスタート
                },
                (err) => {
                    //取得失敗のときは銀座からスタート
                    clearTimeout(timer);
                    console.log("位置情報の取得に失敗しました", err.message);
                    startAt(GINZA_POS);
                },
                { timeout: GEOLOCATION_TIMEOUT_MS }
            );
        } else {
            //demo、または位置情報が使えない環境では銀座ライオン前からスタート
            navigator.permissions?.query({ name: "geolocation" }).then((result) => {
                if (result.state === "denied") {
                    setToastMessage("位置情報がブロックされています。設定を確認してください");
                    setTimeout(() => setToastMessage(null), 5000);
                }
            });
            startAt(GINZA_POS);

        }
        refreshHistory();

        return () => {
            started = true;
            clearTimeout(timer);
        };
    }, []);

    const updateCurrentPos = (id: any, newPos: any) => {
        setOpenedModalLocations(prev => prev.map(m =>
            m.id === id ? { ...m, currentPos: newPos } : m
        ));
    };
    const updatedPos = (id: any, newPos: any) => {
        setOpenedModalLocations(prev => prev.map(m =>
            m.id === id ? { ...m, pos: newPos } : m
        ));
    };

    const handleCurrentLocation = () => {
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    const nowPos = {
                        lat: position.coords.latitude,
                        lng: position.coords.longitude,
                    };
                    setCurrentPosOfCamera(nowPos);
                    setRedMarkerPos(nowPos);
                    setHomeTrigger(prev => prev + 1);
                },
                (error: GeolocationPositionError) => {
                    console.log("位置情報の取得に失敗しました");
                    //位置情報が取得できない旨の、エッセージを出力
                    //setToastMessage("位置情報がオフになっています。設定を確認してください");
                    //setTimeout(() => setToastMessage(null), 5000);

                    if (error.code === error.PERMISSION_DENIED) {
                        setToastMessage("位置情報がブロックされています。設定を確認してください");
                        // オフ・ブロック
                    } else if (error.code === error.TIMEOUT) {
                        // 時間切れ
                        setToastMessage("位置情報取得タイムアウトです");
                    } else {
                        // 位置を特定できない
                        setToastMessage("位置情報が取得できません");
                    }

                    setTimeout(() => setToastMessage(null), 5000);

                },
                { enableHighAccuracy: true }
            );
        }
    };

    const handleHome = () => {
        if (currentPosOfHome) {
            setCurrentPosOfCamera({
                lat: currentPosOfHome.lat,
                lng: currentPosOfHome.lng
            });
            setRedMarkerPos({
                lat: currentPosOfHome.lat,
                lng: currentPosOfHome.lng
            });
            setHomeTrigger(Date.now());
        }
    };

    if (!currentPosOfCamera) {
        return (
            <div className="flex h-screen w-full items-center justify-center bg-gray-50 text-gray-500">
                <div className="flex flex-col items-center gap-2">
                    <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-500 border-t-transparent"></div>
                    <p className="text-lg font-medium">現在地確認中...</p>
                </div>
            </div>
        );
    }
    const onFetchLogs = async (id: number | string) => {

        if (id === initialLocationId) return;

        try {
            const res = await fetch(`/api/get_visited_logs?location_id=${id}`);
            if (res.ok) {
                const data = await res.json();

                await new Promise<void>((resolve) => {
                    setOpenedModalLocations(prev => {
                        const next = prev.map(m => m.id === id ? { ...m, logs: data } : m);
                        resolve();
                        return next;
                    });
                });
            }
        } catch (error) {
            console.error("❌ 履歴取得失敗:", error);
        }
    };

    const updateModalElements = ((targetId: any, updater: any) => {
        setOpenedModalLocations((prev: any) =>
            prev.map((m: any) => m.id === targetId ? updater(m) : m)
        )

    })

    return (

        <APIProvider
            apiKey={process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY as string}
            libraries={['places', 'geometry']}
            language={'jp'}
            region={'jp'}
        >
            {toastMessage && (
                <div style={{
                    position: 'fixed', top: '80px', left: '50%', transform: 'translateX(-50%)',
                    backgroundColor: 'rgba(0,0,0,0.8)', color: 'white',
                    padding: '12px 20px', borderRadius: '8px', zIndex: 2000
                }}>
                    {toastMessage}
                </div>
            )}
            {isDesktop && (
                <div className="fixed top-2.5 left-50 right-4 bg-transparent z-50 pointer-events-none flex items-start gap-2">
                    <div className="pointer-events-auto w-[40%]">
                        <Header
                            isDesktop={isDesktop}
                            setIsDesktop={setIsDesktop}
                        />
                    </div>
                    <div className="pointer-events-auto ml-6">
                        <input
                            type="text"
                            value={searchKeyword}
                            onChange={(e) => setSearchKeyword(e.target.value)}
                            placeholder="訪問場所名で検索"
                            className="h-8 px-2 rounded-sm border border-3 border-[#388778] bg-white text-sm shadow-sm focus:outline-none"
                        />
                    </div>
                </div>
            )}
            <MapContainer
                isDesktop={isDesktop}
                setIsDesktop={setIsDesktop}

                currentPosOfCamera={currentPosOfCamera}
                currentPosOfHome={currentPosOfHome}
                setCurrentPosOfCamera={setCurrentPosOfCamera}
                visitedLocations={visitedLocations}
                setVisitedLocations={setVisitedLocations}
                initialLocationId={initialLocationId}
                setInitialLocationId={setInitialLocationId}
                homeTrigger={homeTrigger}
                openedModalLocations={openedModalLocations}
                setOpenedModalLocations={setOpenedModalLocations}
                currentZoom={currentZoom}
                setCurrentZoom={setCurrentZoom}
                setModalPos={setModalPos}
                redMarkerPos={redMarkerPos}
                setRedMarkerPos={setRedMarkerPos}
                searchKeyword={searchKeyword}
            />
            <button
                onClick={handleCurrentLocation}
                style={{
                    position: 'fixed', bottom: '380px', right: '7px',
                    width: '45px', height: '45px', borderRadius: '50%',
                    backgroundColor: 'white', border: 'none', fontSize: '24px',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.2)', cursor: 'pointer', zIndex: 1000
                }}
            >
                📍
            </button>
            <button
                onClick={handleHome}
                style={{
                    position: 'fixed', bottom: '320px', right: '7px',
                    width: '45px', height: '45px', borderRadius: '50%',
                    backgroundColor: 'white', border: 'none', fontSize: '24px',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.2)', cursor: 'pointer', zIndex: 1000
                }}
            >
                🏠
            </button>

            <button
                onClick={() => {
                    if (!currentPosOfCamera) return;
                    setRedMarkerPos({
                        lat: currentPosOfCamera.lat,
                        lng: currentPosOfCamera.lng
                    });
                }}
                style={{
                    position: 'fixed',
                    bottom: '260px',
                    right: '7px',
                    width: '45px',
                    height: '45px',
                    borderRadius: '50%',
                    backgroundColor: 'white',
                    color: 'white',
                    border: 'none',
                    fontSize: '20px',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
                    cursor: 'pointer',
                    zIndex: 1000,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                }}
                title="ピンを画面中央に呼び出す"
            >
                🎯
            </button>

            <ChatWidget />

            {openedModalLocations.map((modal, index: number) => {
                const isFocused = activeGroupId === modal.id
                return (
                    <React.Fragment key={`group-${modal.tempId || modal.id}`}>
                        <ModalLocation
                            key={`location-${modal.id}`}
                            modal={modal}
                            initialLocationId={initialLocationId}
                            setInitialLocationId={setInitialLocationId}
                            updateModalElements={updateModalElements}
                            isFocused={isFocused}
                            onFocus={() => {
                                setActiveGroupId(modal.id)
                            }}
                            clickedModalId={clickedModalId}
                            setClickedModalId={setClickedModalId}
                            initialModalPos={modal.currentPos}
                            openedModalLocations={openedModalLocations}
                            setOpenedModalLocations={setOpenedModalLocations}
                            openedModalGoogle={modal.data}
                            updateCurrentPos={(newPos: any) => updateCurrentPos(modal.id, newPos)}
                            updatePos={(newPos: any) => updatedPos(modal.id, newPos)}
                            isGoogleView={modal.data.isShowingGoogle}
                            setIsGoogleView={setIsGoogleView}
                            logs={modal.logs || []}
                            onSaveSuccess={refreshHistory}
                            isExisting={modal.id !== initialLocationId}
                            onFetchLogs={() => onFetchLogs(modal.id)}
                            moveDist={moveDist}
                            setMoveDist={setMoveDist}
                            setActiveGroupId={setActiveGroupId}
                            onSavingLocation={onSavingLocation}
                            setOnSavingLocation={setOnSavingLocation}
                            setCurrentPosOfHome={setCurrentPosOfHome}
                            onCloseModalLocation={() => {
                                setOpenedModalLocations(prev =>
                                    prev.filter(record => record.id !== modal.id)

                                );

                            }}
                            onClose={() => {
                                setOpenedModalLocations(prev => prev.filter(m => m.id !== modal.id));
                            }}
                            setOpenedModalGoogle={(newData: any) => {
                                setOpenedModalLocations(prev => prev.map(m =>
                                    m.id === modal.id ? { ...m, data: newData } : m
                                ));
                            }}
                            setCurrentMarker={() => {
                                if (modal.data.isRedFootMark) return;
                                setOpenedModalLocations((prev: any[]) => {
                                    return prev.map((m: any) =>
                                        m.id === modal.id
                                            ? {
                                                ...m,
                                                data: {
                                                    ...m.data,
                                                    isCurrentMarker: m.data.isCurrentMarker ? false : true,
                                                }
                                            }
                                            : m
                                    );
                                });

                            }}

                        />
                        <ModalGoogle
                            key={`google-${modal.id}`}
                            modal={modal}
                            initialLocationId={initialLocationId}
                            setInitialLocationId={setInitialLocationId}
                            updateModalElements={updateModalElements}
                            isFocused={activeGroupId === modal.id}
                            onFocus={() => setActiveGroupId(modal.id)}
                            clickedModalId={clickedModalId}
                            setClickedModalId={setClickedModalId}
                            setActiveGroupId={setActiveGroupId}
                            setOpenedModalLocations={setOpenedModalLocations}
                            openedModalLocations={openedModalLocations}
                            onSavingLocation={onSavingLocation}
                            setOnSavingLocation={setOnSavingLocation}

                            initialModalPosGoogle={
                                modal.data.hasMovedEnough ?
                                    {
                                        x: modal.currentPos.x - 80,
                                        y: modal.currentPos.y + 40,
                                    }
                                    : null
                            }

                            openedModalGoogle={modal.data}
                            isGoogleView={modal.data.isShowingGoogle}

                            setIsGoogleView={setIsGoogleView}

                            logs={modal.logs || []}

                            onFetchLogs={() => onFetchLogs(modal.id)}
                            onClose={() => {
                                setOpenedModalLocations((prev: any[]) => {
                                    return prev.map((m: any) =>
                                        m.id === modal.id
                                            ? {
                                                ...m,
                                                googleData: {
                                                    ...m.googleData,
                                                    isShowingGoogle: false
                                                }
                                            }
                                            : m
                                    );
                                });

                            }}

                        />
                        <ModalLogs
                            key={`log-${modal.id}`}
                            modal={modal}
                            updateModalElements={updateModalElements}
                            initialLocationId={initialLocationId}
                            setInitialLocationId={setInitialLocationId}
                            isFocused={activeGroupId === modal.id}
                            onFocus={() => setActiveGroupId(modal.id)}
                            clickedModalId={clickedModalId}
                            setClickedModalId={setClickedModalId}
                            setActiveGroupId={setActiveGroupId}
                            renderMe={renderMe}
                            openedModalLocations={openedModalLocations}
                            setOpenedModalLocations={setOpenedModalLocations}
                            setIsCommentRecordExist={setIsCommentRecordExist}
                            onSavingLocation={onSavingLocation}
                            setOnSavingLocation={setOnSavingLocation}

                            initialModalPosLogs={
                                modal.data.hasMovedEnough ?
                                    {
                                        x: modal.currentPos.x + 40,
                                        y: modal.currentPos.y + 40
                                    }
                                    : null
                            }
                            openedModalGoogle={modal.data}
                            isGoogleView={modal.data.isShowingGoogle}

                            setIsGoogleView={setIsGoogleView}

                            logs={modal.logs || []}

                            onFetchLogs={() => onFetchLogs(modal.id)}

                            onClose={() => {
                                setOpenedModalLocations((prev: any[]) => {
                                    return prev.map((m: any) =>
                                        m.id === modal.id ? {
                                            ...m,
                                            data: {
                                                ...m.data,
                                                isShowingLogs: false
                                            }
                                        }
                                            : m
                                    );
                                });

                            }}
                        />
                        {modal.comments
                            ?.filter((c: any) => c.isShowingComment)
                            ?.map((c: any, index: number) => (
                                c.isShowingComment && (
                                    <ModalComments
                                        key={`comment-${c.logId}`}
                                        updateModalElements={updateModalElements}
                                        initialLocationId={initialLocationId}
                                        setInitialLocationId={setInitialLocationId}
                                        logs={modal.logs || []}
                                        comment={c}
                                        logId={c.logId}
                                        commentId={c.id}
                                        modal={modal}
                                        isFocused={activeGroupId === modal.id}
                                        onFocus={() => setActiveGroupId(modal.id)}
                                        clickedModalId={clickedModalId}
                                        setClickedModalId={setClickedModalId}
                                        setActiveGroupId={setActiveGroupId}
                                        initialPos={c.pos}
                                        onFetchLogs={() => onFetchLogs(modal.id)}
                                        openedModalLocations={openedModalLocations}
                                        setOpenedModalLocations={setOpenedModalLocations}
                                        onSaveSuccess={refreshHistory}
                                        isCommentRecordExist={isCommentRecordExist}

                                        onClose={() => {
                                            setOpenedModalLocations(prev =>
                                                prev.map(loc =>
                                                    loc.id === modal.id
                                                        ? {
                                                            ...loc,
                                                            comments: loc.comments.filter((item: any) =>
                                                                item.logId !== c.logId)
                                                        }
                                                        : loc
                                                )
                                            );
                                        }}
                                        initialModalPosComments={
                                            modal.data.hasMovedEnough ?
                                                {
                                                    x: modal.currentPos.x + 40 * (2 + index),
                                                    y: modal.currentPos.y + 40 * (2 + index)
                                                }
                                                : null
                                        }
                                    />
                                )
                            ))}
                    </React.Fragment>
                )
            })
            }
        </APIProvider>
    );
}
