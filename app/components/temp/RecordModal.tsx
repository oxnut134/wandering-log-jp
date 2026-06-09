"use client";
import { useState, useEffect, useRef } from "react";
import { useMap } from "@vis.gl/react-google-maps";
//import VisitedLogList from '../VisitedLogList';
declare global {
  interface Window { google: any; }
}
declare const google: any;

export default function RecordModal({ tempOpenedModal, setTempOpenedModal, onClose, onSave, isExisting, initialModalPos, onFetchLogs, logs }: any) {
    const map = useMap();
    const [isGoogleView, setIsGoogleView] = useState(false);
    const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);

    const [localPos, setLocalPos] = useState(initialModalPos);
    const [gNewX, setGNewX] = useState<number | undefined>();

    // 💡 2. 次に「監視カメラ」を回す（useStateより下）
    /*useEffect(() => {
        //const ax = window.innerWidth;
        //const bx = 260;

        console.log("📍 モーダル現在地:", "NewX:", gNewX, "ax:", gAx, "bx:", gBx,);
    }, [gNewX]);*/ // 👈 localPosが変わるたびに実行

    const handleSave = async () => {
        const res = await fetch("/api/wandering_where", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(tempOpenedModal) });
        if (res.ok) { onSave(); onClose(); }
    };

    const handleDelete = async () => {
        if (!confirm("削除しますか？")) return;
        const res = await fetch("/api/wandering_where", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: tempOpenedModal.id }) });
        if (res.ok) { onSave(); onClose(); }
    };

    const handleGoogleSearch = () => {
        if (!map || !window.google) return;
        const service = new google.maps.places.PlacesService(map as any);
        service.nearbySearch({
            location: {
                lat: Number(tempOpenedModal.latitude),
                lng: Number(tempOpenedModal.longitude)
            }, rankBy: google.maps.places.RankBy.DISTANCE, type: 'establishment'
        },
            (results:any, status:any) => {
                if (status === "OK" && results) {
                    const p = results[0];
                    setTempOpenedModal({ ...tempOpenedModal, googleData: { place_id: p.place_id, name: p.name, category: p.types?.join(','), address: p.vicinity } });
                    setIsGoogleView(true);
                }
            });
    };

    //let gNewX:any,gAx:any,gBx:any;
    const xRef = useRef<number | undefined>(undefined);
    let gAx: any, gBx: any;
    // 💡 ドラッグ中および終了時の計算ロジック
    // 1. Stateの定義（ここが唯一の真実の座標）
    //const [localPos, setLocalPos] = useState(initialModalPos);

    const handleMouseDown = (e: React.MouseEvent) => {
        // 💡 2. 掴んだ瞬間に「マウスとモーダルの距離」をこの関数内だけで固定
        const startX = e.clientX - localPos.x;
        const startY = e.clientY - localPos.y;


        const handleMouseMove = (moveEvent: MouseEvent) => {
            // 💡 3. moveEvent (ブラウザの生イベント) を使って計算
            let newX = moveEvent.clientX - startX;
            let newY = moveEvent.clientY - startY;

            xRef.current = newX;
            console.log("✈️ 代入成功 (Ref):", xRef.current);

            const ax = window.innerWidth;
            const ay = window.innerHeight;
            const bx = 260; // モーダル幅
            const by = 320; // モーダル高

            //gNewX=newX;
            setGNewX(newX);
            gAx = ax;
            gBx = bx;

            // 💡 4. あなたの定義した境界線ガード・ロジック (Mmyu < Bmyu => Mbyu = 0)
            if (newX < 0) {
                newX = 0; // 左端固定
            } else if (newX + bx > ax) {
                newX = ax - bx - 30; // 右端固定
            }

            if (newY < by) {
                newY = by + 60; // 上端固定 (transformの影響を考慮)
            } else if (newY > ay) {
                newY = ay; // 下端固定
            }

            // 監査ログ（これで数値が出るようになります）
            console.log("✈️ 移動中監査:", { newX, newY });

            setLocalPos({ x: newX, y: newY });
        };

        const handleMouseUp = () => {
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);
            //syncMapPositionWithModal();
        };

        document.addEventListener('mousemove', handleMouseMove);
        document.addEventListener('mouseup', handleMouseUp);
    };


    const syncMapPositionWithModal = () => {
        if (!map) return;

        const projection = map.getProjection();
        if (!projection) return;

        // 1. 現在のモーダルの表示位置 (localPos)
        // transform: translate(0, -100%) なので、実質の「指している点」は localPos そのもの
        const point = new google.maps.Point(localPos.x, localPos.y);

        // 2. 【核心】ピクセル座標を緯度経度 (LatLng) に変換
        // 💡 Projection を使ってブラウザの枠内の位置を地球上の座標へ翻訳
        const latLng = projection.fromPointToLatLng(point);

        if (latLng) {
            // 3. 親のステート (tempOpenedModal) を更新
            // これにより、地図をドラッグしてもこの新しい地点にモーダルが固定されます
            setTempOpenedModal((prev: any) => ({
                ...prev,
                latitude: latLng.lat(),
                longitude: latLng.lng()
            }));
            console.log("📍 地図上の位置を同期しました:", latLng.lat(), latLng.lng());
        }
    };

    const close = (e: React.MouseEvent) => {
        //e.stopPropagation(); // 💡 イベントの連鎖を断ち切る
        onClose();
    };
    const closeGoogleView = () => {
        //e.stopPropagation(); // 💡 イベントの連鎖を断ち切る
        setIsGoogleView(false); // 💡 ただのフラグオフ
    };
    console.log("tempOpenedModal:", tempOpenedModal);
    //console.log("newX:", gNewX,"ax:", gAx,"bx:", gBx);
    return (
        <>
            <div
                style={{
                    position: 'absolute',
                    top: `${localPos.y - 15}px`, // 少し余裕を持たせる
                    left: `${localPos.x + 15}px`,
                    transform: 'translate(0, -100%)',
                    backgroundColor: 'white',
                    padding: '16px', // 12pxから16pxへ。余白に呼吸を持たせる
                    borderRadius: '10px',
                    width: '260px', // 220pxと300pxの中間、260pxが「不沈の正解」
                    boxShadow: '0 6px 20px rgba(0,0,0,0.18)',
                    fontSize: '13px' // 小さすぎず読みやすいサイズ
                }}
                onClick={(e) => e.stopPropagation()}
            >
                <div
                    onMouseDown={handleMouseDown}
                    style={{
                        background: '#f3f4f6', padding: '8px 12px', cursor: 'move',
                        borderBottom: '1px solid #ddd', userSelect: 'none', fontSize: '11px'
                    }}
                >
                    ::: {isExisting ? "既存訪問先" : "新規訪問先"} (ドラッグ可)
                </div>

                {/* ...以下、コンテンツ部分（localPos.x/y を参照するように）... */}
                <h4 style={{ margin: '0 0 10px 0', fontSize: '15px', fontWeight: 'bold' }}>
                    {isExisting ? "③ 既存訪問先" : "② 初めての訪問先"}
                </h4>
                <p style={{ fontSize: '11px', color: '#777', marginBottom: '10px' }}>
                    緯度: {Number(tempOpenedModal.latitude || 0).toFixed(5)} /
                    経度: {Number(tempOpenedModal.longitude || 0).toFixed(5)}
                </p>
                {/*<p style={{ fontSize: '11px', color: '#777', marginBottom: '10px' }}>
                    緯度:{tempOpenedModal.latitude?.toFixed(5)} / 経度:{tempOpenedModal.longitude?.toFixed(5)}
                </p>*/}

                {!isGoogleView  ? (
                    <>
                        <input
                            style={{
                                width: '100%',
                                marginBottom: '8px',
                                border: '1px solid #bbb', // 少し視認性を上げる
                                borderRadius: '6px',
                                padding: '4px', // 指でタップしやすい高さ
                                fontSize: '12px',
                                outline: 'none'
                            }}
                            value={tempOpenedModal.name || ""}
                            onChange={e => setTempOpenedModal({ ...tempOpenedModal, name: e.target.value })}
                            placeholder="名称を入力"
                        />

                        <textarea
                            style={{
                                width: '100%',
                                height: '70px', // 入力しやすさを確保
                                marginBottom: '6px',
                                border: '1px solid #bbb',
                                borderRadius: '6px',
                                padding: '4px',
                                fontSize: '10px',
                                resize: 'none'
                            }}
                            value={tempOpenedModal.comment || ""}
                            onChange={e => setTempOpenedModal({ ...tempOpenedModal, comment: e.target.value })}
                            placeholder="コメントを残す"
                        />

                        <button
                            onClick={handleSave}
                            style={{
                                width: '100%',
                                background: '#2563eb',
                                color: 'white',
                                marginBottom: '6px',
                                borderRadius: '6px',
                                padding: '10px', // 押しやすいボタンサイズ
                                fontSize: '14px',
                                fontWeight: 'bold',
                                border: 'none',
                                cursor: 'pointer'
                            }}
                        >
                            保存する
                        </button>


                        <div style={{ display: 'flex', gap: '6px', marginBottom: '5px' }}>
                            <button
                                onClick={handleGoogleSearch}
                                style={{
                                    flex: 1, // 均等に横幅を分ける
                                    background: '#ffffff',
                                    color: '#2563eb',
                                    borderRadius: '6px',
                                    padding: '8px',
                                    fontSize: '11px',
                                    border: '1px solid #2563eb'
                                }}
                            >
                                Google情報
                            </button>

                            <button
                                onClick={() => {
                                    setIsHistoryModalOpen(true)
                                    if (onFetchLogs) {
                                        onFetchLogs();
                                    }
                                }} // 💡 履歴を開く
                                style={{
                                    flex: 1,
                                    background: '#f3f4f6',
                                    color: '#374151',
                                    borderRadius: '6px',
                                    padding: '8px',
                                    fontSize: '11px',
                                    border: '1px solid #d1d5db'
                                }}
                            >
                                訪問記録
                            </button>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '12px', fontSize: '12px' }}>
                            {isExisting && <button onClick={handleDelete} style={{ color: '#ef4444', background: 'none', border: 'none', cursor: 'pointer' }}>履歴を削除</button>}
                            <button
                                onClick={onClose}
                                style={{ background: 'none', border: 'none', color: '#6b7280', cursor: 'pointer' }}>
                                閉じる
                            </button>
                        </div>
                    </>
                ) : (
                    <>
                        <div style={{ fontSize: '14px', textAlign: 'center' }}>
                            <p style={{ marginBottom: '12px' }}>Google名: <br /><strong>{tempOpenedModal.googleData.name}</strong></p>
                            <button
                                style={{ width: '100%', padding: '10px', borderRadius: '6px', background: '#10b981', color: 'white', border: 'none', fontWeight: 'bold' }}
                                onClick={() => { setTempOpenedModal({ ...tempOpenedModal, name: tempOpenedModal.googleData.name }); setIsGoogleView(false); }}
                            >
                                この名称を反映
                            </button>
                        </div>
                        <div>
                            <button
                                //onClick={onClose}
                                onClick={closeGoogleView}
                                style={{ background: 'none', border: 'none', color: '#6b7280', cursor: 'pointer' }}>
                                閉じる
                            </button>
                        </div>
                    </>
                )}
                <div style={{ marginTop: '10px' }}>
                    {/* 💡 1. 履歴ボタンが押された時（isHistoryModalOpenがtrue）だけ表示する */}
                    {/*{isHistoryModalOpen && (
                        <VisitedLogList logs={logs} />
                    )}*/}
                </div>
            </div>

        </>
    );
}
