
"use client";
import { useState, useEffect, useRef } from 'react';
import { useMap } from "@vis.gl/react-google-maps";

export default function ModalComments({ modal, comment, updateModalElements, activeComment, logId, commentId, isFocused, onFocus, renderMe, setOpenedModalLocations, openedModalLocations, isGoogleView, setIsGoogleView, openedModalGoogle, setOpenedModalGoogle, onClose, onSave, isExisting, initialModalPosComments, onFetchLogs, logs, isDraggingRef, onSaveSuccess, isCommentRecordExist, memoNo, setActiveGroupId }: any) {
    const map = useMap();

    const [gNewX, setGNewX] = useState<number | undefined>();
    const [localPos, setLocalPos] = useState<{ x: number, y: number }>(
        initialModalPosComments ?? { x: modal.currentPos.x + 40, y: modal.currentPos.y + 40 }
    ); 
    const [onSaving, setOnSaving] = useState(false);
    const LIMIT = 500;
    const [isConfirming, setIsConfirming] = useState(false);

    useEffect(() => {
        return () => {
            document.removeEventListener('mousemove', () => { });
            document.removeEventListener('mouseup', () => { });
            document.removeEventListener('touchmove', () => { });
            document.removeEventListener('touchend', () => { });
            const allValues = openedModalLocations.flatMap((m: any) => [
                Number(m.locations?.zIndexValue) || 1000,
                Number(m.google?.zIndexValue) || 1000,
                Number(m.log?.zIndexValue) || 1000,
                ...(m.comments || []).map((c: any) => Number(c.zIndexValue) || 1000)
            ]);

        };
    }, []);

    useEffect(() => {
        if (initialModalPosComments) {
            setLocalPos({
                x: initialModalPosComments.x,
                y: initialModalPosComments.y
            });

            if (modal.data.hasMovedEnough) {
                updateModalElements(modal.id, (dummy: any) => ({
                    ...dummy,
                    data: {
                        ...dummy.data,
                        hasMovedEnough: false
                    }
                }));
            }

        }
    }, [initialModalPosComments]);

    useEffect(() => {

        onFetchLogs();

        setOpenedModalLocations((prev: any[]) => {
            return prev.map((m: any) =>
                m.id === modal.id
                    ? {
                        ...m,
                        currentPos: { x: modal.currentPos.x + 40, y: modal.currentPos.y + 40 }
                    }
                    : m
            );
        });

    }, []);

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

    const handleMouseDown = (e: any) => {
        if (!e.touches && e.button !== 0) return;

        if (!localPos) return;
        e.stopPropagation();

        onFocus();
        handleUpdateGroupZIndex();

        const clientX = e.touches ? e.touches[0].clientX : e.clientX;
        const clientY = e.touches ? e.touches[0].clientY : e.clientY;

        const startX = clientX - localPos.x;
        const startY = clientY - localPos.y;

        const handleMouseMove = (moveEvent: any) => {
            const moveX = moveEvent.touches ? moveEvent.touches[0].clientX : moveEvent.clientX;
            const moveY = moveEvent.touches ? moveEvent.touches[0].clientY : moveEvent.clientY;

            let newX = moveX - startX;
            let newY = moveY - startY;

            xRef.current = newX;
            yRef.current = newY;

            const ax = window.innerWidth;
            const ay = window.innerHeight;
            const bx = 260;
            const by = 280;

            setGNewX(newX);
            gAx = ax;
            gBx = bx;

            // 境界線ガード・ロジック (Mmyu < Bmyu => Mbyu = 0)
            if (newX < 0) {
                newX = -10; // 左端固定
            } else if (newX + bx > ax) {
                newX = ax - bx + 10; // 右端固定
            }

            if (newY < by) {
                newY = by + 0; // 上端固定 
            } else if (newY > ay) {
                newY = ay + 10; // 下端固定
            }

            setLocalPos({ x: newX, y: newY });
        };

        const handleMouseUp = () => {
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);
            document.removeEventListener('touchmove', handleMouseMove);
            document.removeEventListener('touchend', handleMouseUp);

        };

        document.addEventListener('mousemove', handleMouseMove);
        document.addEventListener('mouseup', handleMouseUp);
        document.addEventListener('touchmove', handleMouseMove, { passive: false });
        document.addEventListener('touchend', handleMouseUp);

    };

    const handleSave = async () => {
        const currentData = modal.comments?.find((c: any) => c.logId === logId);
        if (!currentData) {
            console.error("保存対象のデータが見つかりません");
            return;
        }

        setOnSaving(true)
        const payload = {
            log_id: logId,
            commentText: currentData.comment,
        };

        const res = await fetch("/api/save_comment", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
        });
        if (res.ok) {
            if (res.ok) {
                const savedData = await res.json();

                setOpenedModalLocations((prev: any[]) => {
                    return prev.map((m: any) => {
                        if (m.id !== modal.id) return m;

                        const currentComments = m.comments || [];

                        const exists = currentComments.some((c: any) => c.logId === logId);

                        let updatedComments;
                        if (exists) {
                            updatedComments = currentComments.map((c: any) =>
                                c.logId === logId ? { ...c, id: savedData.id, isExistingComment: true } : c
                            );
                        } else {
                            updatedComments = [
                                ...currentComments,
                                {
                                    id: savedData.id,
                                    logId: logId,
                                    comment: currentData.comment,
                                    isExistingComment: true,
                                }
                            ];
                        }

                        return {
                            ...m,
                            comments: updatedComments
                        };
                    });
                });

                if (onSaveSuccess) onSaveSuccess();
            }


            if (onSaveSuccess) onSaveSuccess();
        }
        setOnSaving(false)
        if (res.ok) return;
    }

    if (!localPos) {
        return;
    }
    const handleDeleteComment = async () => {
        const res = await fetch("/api/delete_comments_record", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: commentId }) });
        if (res.ok) {
            onClose();
        }
    };

    return (
        <>
            <div
                style={{
                    width: '15%',
                    minWidth: '180px',
                    position: 'absolute',
                    top: `${localPos.y - 15}px`,
                    left: `${localPos.x + 15}px`,
                    transform: 'translate(0, -100%)',
                    zIndex: comment?.zIndexValue,
                    border: isFocused ? '3px solid #ff4444' : '1px solid #ccc',
                    boxShadow: isFocused ? '0 10px 30px rgba(0,0,0,0.2)' : 'none',
                    backgroundColor: 'white',
                    padding: '10px',
                    borderRadius: '10px',
                    fontSize: '13px',
                    WebkitUserSelect: 'none',
                    userSelect: 'none',
                }}
                onClick={(e) => e.stopPropagation()}
            >
                <div
                    onMouseDown={handleMouseDown}
                    onContextMenu={(e) => e.preventDefault()}
                    onTouchStart={handleMouseDown}
                    style={{
                        touchAction: 'none',
                        background: '#f3f4f6', padding: '8px 12px', cursor: 'move',
                        borderBottom: '1px solid #ddd', userSelect: 'none', fontSize: '11px',
                        borderRadius: '6px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'

                    }}
                    onDoubleClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        if (!isFocused) return;
                        e.preventDefault();
                        const allValues = openedModalLocations.flatMap((m: any) => [
                            Number(m.locations?.zIndexValue) || 1000,
                            Number(m.google?.zIndexValue) || 1000,
                            Number(m.log?.zIndexValue) || 1000,
                            ...(m.comments || []).map((c: any) => Number(c.zIndexValue) || 1000)
                        ]);
                        const nextZ = Math.max(1000, ...allValues) + 1;
                        updateModalElements(modal.id, (dummy: any) => ({
                            ...dummy,
                            comments: (dummy.comments || []).map((c: any) => {
                                if (c.logId === comment.logId) {
                                    return {
                                        ...c,
                                        zIndexValue: nextZ,
                                    }
                                }

                                return c;


                            }),

                        }));

                        setActiveGroupId(modal.id);
                    }}

                >
                    {modal.data.isNew ? "新規訪問先" : "既存訪問先"} (ドラッグ)
                </div>

                <div style={{ marginTop: '10px', borderTop: '1px solid #eee', paddingTop: '10px' }}>
                    <h5 style={{ fontSize: '12px', color: '#666', marginBottom: '2px' }}>
                        <strong>🚩 メモ</strong>
                    </h5>
                    <div style={{ maxHeight: '150px', overflowY: 'auto' }}>
                        {logs
                            .filter((log: any) => log.id === logId)
                            .map((log: any, index: any) => (
                                <div key={log.id || index} style={{
                                    fontSize: '12px',
                                    padding: '1px 0',
                                    borderBottom: '1px dashed #f0f0f0',
                                    display: 'flex',
                                    justifyContent: 'space-between'
                                }}>
                                    <span style={{ fontWeight: 'normal' }}>
                                        {(() => {
                                            const dateStr = String(log.visited_at);
                                            const date = new Date(dateStr.endsWith('Z') ? dateStr : dateStr + 'Z');

                                            if (isNaN(date.getTime())) return 'Invalid Date';

                                            return date.toLocaleString('ja-JP', {
                                                year: 'numeric',
                                                month: '2-digit',
                                                day: '2-digit',
                                                hour: '2-digit',
                                                minute: '2-digit',
                                                timeZone: 'Asia/Tokyo'
                                            });
                                        })()}
                                    </span>

                                    <span style={{ color: '#aaa' }}>#{comment.memoNo}</span>
                                </div>
                            ))}
                    </div>
                    <textarea
                        maxLength={500}
                        style={{
                            width: '100%',
                            height: '10vh',
                            display: 'block',
                            border: '1px solid #bbb',
                            borderRadius: '6px',
                            padding: '4px',
                            fontSize: '10px',
                            resize: 'none'
                        }}
                        value={modal.comments?.find((l: any) => l.logId === logId)?.comment || ""}
                        onChange={(e) => {
                            const newValue = e.target.value;
                            setOpenedModalLocations((prev: any[]) =>
                                prev.map((m: any) =>
                                    m.id === modal.id
                                        ? {
                                            ...m,
                                            comments: m.comments?.map((c: any) =>
                                                c.logId === logId ? { ...c, logId: logId, comment: newValue } : c
                                            )
                                        }
                                        : m
                                )
                            );
                        }}
                        placeholder="メモを残す"
                    />
                    <div style={{ textAlign: 'right', margin: '0 0 2px 0', fontSize: '8px', color: '#888' }}>
                        {(modal.comments?.find((l: any) => l.logId === logId)?.comment || "").length} / 500文字
                    </div>
                </div>
                <button
                    onClick={handleSave}
                    style={{
                        width: '100%',
                        height: '4vh',
                        background: '#2563eb',
                        color: 'white',
                        marginBottom: '6px',
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
                    {onSaving ? (
                        <>
                            <div>
                                <span>処理中...</span>
                            </div>
                        </>
                    ) : (
                        "保存する"
                    )}
                </button>
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    fontSize: '10px'
                }}>
                    <button
                        onClick={onClose}
                        style={{ margin: '5px 0 0 0', background: 'none', border: 'none', color: '#6b7280', cursor: 'pointer' }}>
                        閉じる
                    </button>
                    {comment.isExistingComment && (isConfirming ? (
                        <button
                            style={{ width: '30%', height: '3vh', background: '#ef4444', color: 'white', border: 'none', fontWeight: 'bold', borderRadius: '6px' }}
                            onClick={handleDeleteComment}
                        >
                            削除確定
                        </button>
                    ) : (
                        <button
                            style={{ width: '30%', height: '3vh', background: '#FBBC04', color: '#6b7280', border: 'none', fontWeight: 'bold', borderRadius: '6px' }}
                            onClick={() => setIsConfirming(true)}
                        >
                            削除
                        </button>
                    ))}
                </div>
            </div >
        </>
    );
}
