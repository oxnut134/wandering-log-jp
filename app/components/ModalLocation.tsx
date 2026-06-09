"use client";
import { useState, useEffect, useRef } from "react";
import { useMap } from "@vis.gl/react-google-maps";
declare const google: any;

export default function ModalLocation({ modal, initialLocationId, setInitialLocationId, clickedModalId, setClickedModalId, updateModalElements, isFocused, onFocus, maxZ, isFocusedLocation, onFocusLocation, setCurrentMarker, openedModalLocations, setOpenedModalLocations, isGoogleView, setIsGoogleView, isModalLogsView, setIsModalLogsView, openedModalGoogle, setOpenedModalGoogle, onSaveSuccess, onCloseModalLocation, isExisting, initialModalPos, onFetchLogs, updateCurrentPos, updatePos, moveDist, setMoveDist, setActiveGroupId, onSavingLocation, setOnSavingLocation, setCurrentPosOfHome }: any) {
    const map = useMap();
    const [localPos, setLocalPos] = useState(initialModalPos);
    const [gNewX, setGNewX] = useState<number | undefined>();
    const [onSaving, setOnSaving] = useState(false);
    const [onSavingLocationLocal, setOnSavingLocationLocal] = useState(false);
    const [isGenerating, setIsGenerating] = useState(false);
    const [descriptionError, setDescriptionError] = useState<string>('');
    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
    const [isConfirming, setIsConfirming] = useState(false);
    let isSavingWithLog: any = true

    const modalRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        return () => {
            document.removeEventListener('mousemove', () => { });
            document.removeEventListener('mouseup', () => { });
            document.removeEventListener('touchmove', () => { });
            document.removeEventListener('touchend', () => { });
        };
    }, []);



    const handleSaveLocationWithLog = async () => {
        setOnSaving(true)
        isSavingWithLog = true;
        handleSave();
        modal.data.isNew && onCloseModalLocation();
    }
    const handleSaveLocation = async () => {
        setOnSavingLocationLocal(true);
        isSavingWithLog = false;
        handleSave();
    }
    const handleSave = async () => {

        setOnSavingLocation(true)

        const payload = {
            id: modal.data.id,
            latitude: modal.data.latitude,
            longitude: modal.data.longitude,
            name: modal.data.name,
            comment: modal.data.comment
        };
        let res: any
        if (isSavingWithLog) {
            res = await fetch("/api/save_location", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload)
            });
        } else {
            res = await fetch("/api/save_location_without_log_update", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload)
            });
        }
        if (res.ok) {
            const savedData = await res.json();
            setOpenedModalLocations((prev: any) =>
                prev.map((m: any) =>
                    m.id === modal.id
                        ? {
                            ...m,
                            id: savedData.id,
                            currentPos: m.data?.isNew
                                ? { x: localPos.x, y: localPos.y }
                                : { x: m.currentPos.x, y: m.currentPos.y },
                            data: {
                                ...m.data,
                                pos: m.pos,
                                id: savedData.id,
                            }
                        }
                        : m
                )
            );
            setTimeout(() => {
                if (onSaveSuccess) onSaveSuccess();
            }, 100);

            onFetchLogs();

        }
        setOnSaving(false);
        setOnSavingLocation(false);
        setOnSavingLocationLocal(false)

        if (res.ok) return;
    }

    const handleGenerateDescription = async () => {
        setIsGenerating(true);
        setDescriptionError('');
        try {
            const res = await fetch('/api/description', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: modal.data.name,
                    lat: modal.data.latitude,
                    lng: modal.data.longitude,
                }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || '生成失敗');
            setOpenedModalGoogle({ ...modal.data, comment: data.description });
        } catch (e: any) {
            setDescriptionError(e.message || 'エラーが発生しました');
        } finally {
            setIsGenerating(false);
        }
    };

    const handleDelete = async () => {
        const res = await fetch("/api/delete_locations_record", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: modal.data.id }) });
        if (res.ok) { onSaveSuccess(); onCloseModalLocation(); }
    };

    const viewFuncRef = useRef(setIsGoogleView);
    useEffect(() => {
        viewFuncRef.current = setIsGoogleView;
    }, [setIsGoogleView]);


    const handleGoogleSearch = () => {
        if (!map || !(window as any).google) return;
        const service = new google.maps.places.PlacesService(map as any);

        service.nearbySearch({
            location: {
                lat: Number(modal.data.latitude),
                lng: Number(modal.data.longitude)
            },
            rankBy: google.maps.places.RankBy.DISTANCE,
            type: 'establishment'
        }, (results: any, status: any) => {
            if (status === google.maps.places.PlacesServiceStatus.OK && results && results[0]) {
                const p = results[0];

                service.getDetails({
                    placeId: p.place_id,
                    fields: ['name', 'place_id', 'types', 'formatted_address', 'url', 'website'] // 💡 欲しい項目を指定
                }, (place: any, detailStatus: any) => {
                    if (detailStatus === google.maps.places.PlacesServiceStatus.OK && place) {
                        const include = p.types.includes("establishment") || p.types.includes("point_of_interest");
                        const ignore = p.types.includes("political") || p.types.includes("locality");
                        const clickPos = new google.maps.LatLng(
                            Number(modal.data.latitude),
                            Number(modal.data.longitude)
                        );
                        const placePos = p.geometry.location;

                        const distance = google.maps.geometry.spherical.computeDistanceBetween(clickPos, placePos);
                        if (!include || ignore || distance > 10) {
                            place.name = "取得できませんでした。";
                            place.place_id = "";
                            place.types = [];
                            place.formatted_address = "";
                            place.url = "";
                            place.website = "";
                        }

                        //zIndex初期値設定
                        const allValues = openedModalLocations.flatMap((m: any) => [
                            Number(m.locations?.zIndexValue) || 1000,
                            Number(m.google?.zIndexValue) || 1000,
                            Number(m.log?.zIndexValue) || 1000,
                            ...(m.comments || []).map((c: any) => Number(c.zIndexValue) || 1000)
                        ]);
                        const nextZ = Math.max(1000, ...allValues);


                        setOpenedModalLocations((prev: any[]) => {
                            return prev.map((m: any) =>
                                m.id === modal.id
                                    ? {
                                        ...m,
                                        data: {
                                            ...m.data,
                                            pos: m.pos,
                                            latitude: modal.data.latitude,
                                            longitude: modal.data.longitude,
                                        },
                                        googleData: {
                                            name: place.name,
                                            place_id: place.place_id,
                                            category: Array.isArray(place.types) ? place.types.join(',') : "",
                                            address: place.formatted_address,
                                            url: place.url,
                                            website: place.website,
                                            isShowingGoogle: true
                                        },
                                        google: {
                                            zIndexValue: nextZ
                                        }
                                    }
                                    : m
                            );
                        });
                        setIsGoogleView(true);
                    }
                });
            }
        });


    };
    const handleShowLogs = () => {
        if (modal.data.isNew) return;

        //zIndex初期値設定
        const allValues = openedModalLocations.flatMap((m: any) => [
            Number(m.locations?.zIndexValue) || 1000,
            Number(m.google?.zIndexValue) || 1000,
            Number(m.log?.zIndexValue) || 1000,
            ...(m.comments || []).map((c: any) => Number(c.zIndexValue) || 1000)
        ]);
        const nextZ = Math.max(1000, ...allValues);

        setOpenedModalLocations((prev: any[]) => {
            return prev.map((m: any) =>
                m.id === modal.id
                    ? {
                        ...m,
                        currentPos: { x: modal.currentPos.x + 40, y: modal.currentPos.y + 40 },
                        data: {
                            ...m.data,
                            isShowingLogs: true,

                        },
                        log: {
                            zIndexValue: nextZ
                        }
                    }
                    : m
            );
        });
    };

    const handleUpdateGroupZIndex = () => {
        const allValues = openedModalLocations.flatMap((m: any) => [
            Number(m.locations?.zIndexValue) || 1000,
            Number(m.google?.zIndexValue) || 1000,
            Number(m.log?.zIndexValue) || 1000,
            ...(m.comments || []).map((c: any) => Number(c.zIndexValue) || 1000)
        ]);
        const nextZ = Math.max(1000, ...allValues) + 1;
        updateModalElements(modal.id, (dummy: any) => ({
            ...dummy,
            locations: {
                ...dummy.locations,
                zIndexValue: nextZ,
            },
            google: {
                ...dummy.google,
                zIndexValue: nextZ,
            },
            log: {
                ...dummy.log,
                zIndexValue: nextZ,
            },
            comments: (dummy.comments || []).map((c: any) => ({
                ...c,
                zIndexValue: nextZ,
            })),
        }));
    };


    const xRef = useRef<number | undefined>(undefined);
    const yRef = useRef<number | undefined>(undefined);
    let gAx: any, gBx: any;
    let lastClick = 0;
    const handleDown = (e: React.MouseEvent | React.TouchEvent | any) => {
        if (!e.touches && e.button !== 0) return;

        e.stopPropagation();
        onFocus();
        handleUpdateGroupZIndex();

        const clientX = e.touches ? e.touches[0].clientX : e.clientX;
        const clientY = e.touches ? e.touches[0].clientY : e.clientY;

        const startX = clientX - localPos.x;
        const startY = clientY - localPos.y;


        const handleMove = (moveEvent: any) => {
            const moveX = moveEvent.touches ? moveEvent.touches[0].clientX : moveEvent.clientX;
            const moveY = moveEvent.touches ? moveEvent.touches[0].clientY : moveEvent.clientY;
            let newX = moveX - startX;
            let newY = moveY - startY;
            xRef.current = newX;
            yRef.current = newY;



            const ax = window.innerWidth;
            const ay = window.innerHeight;
            const bx = isMobile ? 210 : 250;
            const by = (modalRef.current?.offsetHeight || 320) + 15;

            const rightEdgePadding = isMobile ? 40 : 10;

            if (isMobile) {
                if (newX < -10) {
                    newX = -10;
                } else if (newX + bx > ax + rightEdgePadding) {
                    newX = ax - bx + rightEdgePadding;
                }
            } else {
                newX = Math.max(0, Math.min(newX, ax - bx));
            }


            setGNewX(newX);
            gAx = ax;
            gBx = bx;

            if (newX < 0) {
                newX = -10; // 左端固定  left+15の表示オフセット分を考慮
            } else if (newX + bx > ax) {
                newX = ax - bx + 10; // 右端固定
            }

            if (newY < by) {
                newY = by + 5; // 上端固定 
            } else if (newY > ay) {
                newY = ay + 10; // 下端固定
            }


            xRef.current = newX;
            yRef.current = newY;

            setLocalPos({ x: newX, y: newY });

            if (moveEvent.touches) {
                if (moveEvent.cancelable) moveEvent.preventDefault();
            }

        };

        const handleUp = (upE: any) => {
            document.removeEventListener('mousemove', handleMove);
            document.removeEventListener('mouseup', handleUp);
            document.removeEventListener('touchmove', handleMove);
            document.removeEventListener('touchend', handleUp);

            if ((document as any).releaseCapture) {
                (document as any).releaseCapture();
            }


            //---------------- 子モーダル追従ロジック　------------------------------
            const upX = upE.changedTouches ? upE.changedTouches[0].clientX : upE.clientX;
            const upY = upE.changedTouches ? upE.changedTouches[0].clientY : upE.clientY;
            const currentDiffX = upX - clientX;
            const currentDiffY = upY - clientY;
            const dist = Math.sqrt(currentDiffX ** 2 + currentDiffY ** 2)
            setMoveDist({
                x: Math.abs(upX - clientX),
                y: Math.abs(upY - clientY)
            });

            setOpenedModalLocations((prev: any[]) => {
                return prev.map((m: any) =>
                    m.id === modal.id
                        ? {
                            ...m,

                            currentPos: xRef.current !== undefined
                                ? { x: xRef.current, y: yRef.current! }
                                : m.currentPos,
                            data: {
                                ...m.data,
                                hasMovedEnough: dist > 100,
                            }
                        }
                        : m
                );
            });

        };
        document.addEventListener('mousemove', handleMove);
        document.addEventListener('mouseup', handleUp);
        document.addEventListener('touchmove', handleMove, { passive: false });
        document.addEventListener('touchend', handleUp);

    };
    return (
        <>
            <div
                ref={modalRef}
                style={{
                    width: '15%',
                    minWidth: '180px',
                    height: 'auto',
                    position: 'absolute',
                    top: `${localPos.y - 15}px`,
                    left: `${localPos.x + 15}px`,
                    transform: 'translate(0, -100%)',
                    zIndex: modal.locations?.zIndexValue || 1000,
                    border: isFocused ? '3px solid #ff4444' : '1px solid #ccc',
                    boxShadow: isFocused ? '0 10px 30px rgba(0,0,0,0.2)' : 'none',
                    backgroundColor: 'white',
                    padding: '10px',
                    borderRadius: '10px',
                    fontSize: '13px',

                    WebkitUserSelect: 'none',//文字選択なし/iPhone
                    userSelect: 'none',//文字選択なし/PC.android,etc.
                }}
                onClick={(e) => e.stopPropagation()}
                onMouseDown={(e) => {
                    e.stopPropagation();
                }}
                onTouchStart={(e) => {
                    e.stopPropagation();
                }}

            >
                <div style={{
                    width: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                }}>
                    <div style={{
                        width: '96%',
                        height: '6px',
                        background: 'linear-gradient(90deg, #10b981 0%, #a3e635 100%)',
                        borderRadius: '15px 15px 0 0',
                        boxShadow: '0 4px 6px -4px rgba(0,0,0,0.1)'
                    }} />
                </div>
                <div
                    onMouseDown={handleDown}
                    onContextMenu={(e) => e.preventDefault()}
                    onTouchStart={handleDown}
                    style={{
                        height: '4vh', background: '#f3f4f6', padding: '0px 0px', cursor: 'move',
                        boxShadow: '0 4px 6px -4px rgba(0,0,0,0.1)', userSelect: 'none', fontSize: '11px', borderRadius: '0 0 6px 6px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                    }}
                    onDoubleClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        if (!isFocused) return;
                        e.preventDefault();
                        setClickedModalId(modal.id)
                        const allValues = openedModalLocations.flatMap((m: any) => [
                            Number(m.locations?.zIndexValue) || 1000,
                            Number(m.google?.zIndexValue) || 1000,
                            Number(m.log?.zIndexValue) || 1000,
                            ...(m.comments || []).map((c: any) => Number(c.zIndexValue) || 1000)
                        ]);
                        const nextZ = Math.max(1000, ...allValues) + 1;
                        updateModalElements(modal.id, (dummy: any) => ({
                            ...dummy,
                            locations: {
                                ...dummy.locations,
                                zIndexValue: nextZ,

                            }
                        }));


                        setActiveGroupId(modal.id);
                    }}
                >
                </div>

                <div style={{
                    display: 'flex',
                    justifyContent: 'flex-end',
                    alignItems: 'center',
                    margin: '0 0 0px 0'
                }}>
                    {modal.data?.isRedFootMark ? (
                        <button
                            onClick={setCurrentMarker}
                            style={{
                                background: '#f80707c0',
                                color: '#f80707c0',
                                border: '2px solid #000',
                                borderRadius: '6px',
                                padding: '0',
                                fontSize: '12px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                cursor: 'pointer'
                            }}
                        >
                            👣
                        </button>
                    ) : (
                        !modal.data?.isRedFootMark && modal.data?.isCurrentMarker ? (
                            <button
                                onClick={setCurrentMarker}
                                style={{
                                    background: '#07f813c0',
                                    color: '#07f813c0',
                                    border: '2px solid #000',
                                    borderRadius: '6px',
                                    padding: '0',
                                    fontSize: '12px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    cursor: 'pointer'
                                }}
                            >
                                👣
                            </button>
                        ) : (
                            <button
                                onClick={setCurrentMarker}
                                style={{
                                    background: '#FBBC04',
                                    color: '#374151',
                                    border: '2px solid #000',
                                    borderRadius: '6px',
                                    padding: '0',
                                    fontSize: '12px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    cursor: 'pointer'
                                }}
                            >
                                👣
                            </button>
                        )

                    )}

                </div>
                <p style={{ fontSize: '11px', color: '#777', marginBottom: '5px' }}>
                    緯度: {Number(modal.data.latitude || 0).toFixed(4)} /
                    経度: {Number(modal.data.longitude || 0).toFixed(4)}
                </p>
                <input
                    style={{
                        width: '100%',
                        marginBottom: '2%',
                        border: '1px solid #bbb',
                        borderRadius: '6px',
                        padding: '1px',
                        fontSize: '12px',
                        outline: 'none'
                    }}
                    value={modal.data.name || ""}
                    onChange={e => setOpenedModalGoogle({ ...modal.data, name: e.target.value })}
                    placeholder="名称を入力"
                />

                <textarea
                    style={{
                        width: '100%',
                        height: '10vh',
                        marginBottom: '1%',
                        border: '1px solid #bbb',
                        borderRadius: '6px',
                        padding: '4px',
                        fontSize: '10px',
                        resize: 'none'
                    }}
                    value={modal.data.comment || ""}
                    onChange={e => setOpenedModalGoogle({ ...modal.data, comment: e.target.value })}
                    placeholder="メモを残す"
                />

                <div style={{ display: 'flex', marginBottom: '6px' }}>
                    <button
                        onClick={handleGenerateDescription}
                        disabled={isGenerating}
                        style={{
                            width: '33%',
                            height: '3vh',
                            background: isGenerating ? '#9ca3af' : '#7c3aed',
                            color: 'white',
                            borderRadius: '6px',
                            padding: '1px',
                            fontSize: '10px',
                            border: 'none',
                            cursor: isGenerating ? 'not-allowed' : 'pointer',
                        }}
                    >
                        {isGenerating ? '生成中...' : '説明生成'}
                    </button>

                    {!modal.data.isNew && (
                        <button
                            onClick={handleSaveLocation}
                            style={{
                                width: '66%',
                                height: '3vh',
                                background: '#2563eb',
                                color: 'white',
                                borderRadius: '6px',
                                padding: '1px',
                                fontSize: '10px',
                                fontWeight: 'bold',
                                border: 'none',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                marginLeft: 'auto',
                            }}
                        >
                            {onSavingLocationLocal ? <span>処理中...</span> : "保存する"}
                        </button>
                    )}
                </div>

                {descriptionError && (
                    <p style={{ color: '#ef4444', fontSize: '10px', marginBottom: '4px' }}>{descriptionError}</p>
                )}

                <div style={{ marginBottom: '6px' }}>
                    <button
                        onClick={handleSaveLocationWithLog}
                        style={{
                            width: '100%',
                            height: '4vh',
                            background: '#2563eb',
                            color: 'white',
                            borderRadius: '6px',
                            padding: '10px',
                            fontSize: '14px',
                            fontWeight: 'bold',
                            border: 'none',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                        }}
                    >
                        {onSaving ? <span>処理中...</span> : "訪問する"}
                    </button>
                </div>

                <div style={{ display: 'flex', gap: '6px', marginBottom: '5px' }}>
                    <button
                        onClick={handleGoogleSearch}
                        style={{
                            flex: 1,
                            height: '4vh',
                            background: '#ffffff',
                            color: '#2563eb',
                            borderRadius: '6px',
                            padding: '8px',
                            fontSize: '10px',
                            border: '1px solid #2563eb',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            cursor: 'pointer',

                        }}
                    >
                        Google情報
                    </button>
                    {modal.data.isNew ? (
                        <button
                            onClick={() => setCurrentPosOfHome({ lat: modal.data.latitude, lng: modal.data.longitude })}
                            style={{
                                width: '30%', height: '3vh',
                                background: '#FBBC04', color: '#6b7280',
                                border: '1px solid #6b7280',
                                fontSize: '10px', fontWeight: 'bold',
                                borderRadius: '6px', cursor: 'pointer',
                            }}
                        >
                            🏠登録
                        </button>
                    ) : (<button
                        onClick={handleShowLogs}

                        style={{
                            flex: 1,
                            height: '4vh',
                            background: '#fff',
                            color: '#374151',
                            borderRadius: '6px',
                            padding: '8px',
                            fontSize: '10px',
                            border: '1px solid #374151',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            cursor: 'pointer',

                        }}
                    >
                        訪問記録
                    </button>
                    )}
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '5px', fontSize: '10px' }}>
                    <button
                        onClick={onCloseModalLocation}
                        style={{ background: 'none', border: 'none', color: '#6b7280', cursor: 'pointer' }}>
                        閉じる
                    </button>
                    {isExisting && (isConfirming ? (
                        <button
                            style={{ width: '30%', height: '3vh', background: '#ef4444', color: 'white', border: 'none', fontWeight: 'bold', borderRadius: '6px', cursor: 'pointer', }}
                            onClick={handleDelete}
                        >
                            削除確定
                        </button>
                    ) : (
                        <button
                            style={{ width: '30%', height: '3vh', background: '#FBBC04', color: '#6b7280', border: '1px solid #6b7280', fontWeight: 'bold', borderRadius: '6px', cursor: 'pointer', }}
                            onClick={() => setIsConfirming(true)}
                        >
                            削除
                        </button>
                    ))
                    }
                </div>
            </div>
        </>
    );
}
