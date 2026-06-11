"use client";
import { useSession, signOut } from "next-auth/react";
import { Map, AdvancedMarker, MapControl, useMap, Pin, ControlPosition } from "@vis.gl/react-google-maps";
import { useState, useEffect,  memo } from "react";
import HeaderMobile from "./HeaderMobile";

declare const google: any;

function MapContainer({ initialLocationId, redMarkerPos, setRedMarkerPos, setInitialLocationId, setModalPos, updateModalElements, openedModalLocations, setOpenedModalLocations, currentPosOfCamera, setCurrentPosOfCamera, currentPosOfHome, visitedLocations, setVisitedLocations, homeTrigger, onMarkerClick, currentZoom, setCurrentZoom, onCloseModalLocation, searchKeyword }: any) {
    const map = useMap();
    const [isDesktop, setIsDesktop] = useState(true);

    useEffect(() => {
        const media = window.matchMedia('(min-width: 768px)');

        setIsDesktop(media.matches);

        const listener = (e: MediaQueryListEvent) => {
            setIsDesktop(e.matches);
        };

        media.addEventListener('change', listener);

    }, []);


    useEffect(() => {
        if (map && currentPosOfCamera && homeTrigger !== 0) {
            map.panTo(currentPosOfCamera);
        }
        if (map && currentPosOfCamera && homeTrigger !== 0) {
            const currentZoom = map.getZoom();

            map.panTo(currentPosOfCamera);

            if (currentZoom !== undefined) {
                map.setZoom(currentZoom);
            }

        }
    }, [homeTrigger, map]);

    const handleRedMarkerClick = (place?: any, latLng?: any, domEvent?: any) => {
        if (!map || !(window as any).google) return;

        let x = domEvent?.clientX || domEvent?.touches?.[0]?.clientX;
        let y = domEvent?.clientY || domEvent?.touches?.[0]?.clientY;

        let xCheck: any
        let yCheck: any
        if (x === undefined) {
            const projection = map.getProjection();
            const bounds = map.getBounds();

            if (projection && bounds) {
                const nw = new google.maps.LatLng(
                    bounds.getNorthEast().lat(),
                    bounds.getSouthWest().lng()
                );
                const nwPoint = projection.fromLatLngToPoint(nw)!;
                const clickPoint = projection.fromLatLngToPoint(latLng)!;
                const scale = Math.pow(2, map.getZoom()!);

                x = (clickPoint.x - nwPoint.x) * scale;
                y = (clickPoint.y - nwPoint.y) * scale;
                xCheck = x;
                yCheck = y;
            }
        }

        const ax = window.innerWidth;
        const ay = window.innerHeight;
        const bx = 260;
        const by = 320;

        if (x < 0) {
            x = 0; // 左端固定
        } else if (x + bx > ax) {
            x = ax - bx - 30; // 右端固定
        }

        if (y < by) {
            y = by + 60; // 上端固定 
        } else if (y > ay) {
            y = ay; // 下端固定
        }

        const service = new google.maps.places.PlacesService(map as any);
        const latNum = typeof latLng.lat === 'function' ? latLng.lat() : latLng.lat;
        const lngNum = typeof latLng.lng === 'function' ? latLng.lng() : latLng.lng;
        service.nearbySearch({
            location: {
                lat: latNum,
                lng: lngNum
            },
            rankBy: google.maps.places.RankBy.DISTANCE,
            type: 'establishment',
        }, (results: any, status: any) => {
            if (status === "OK" && results && results[0]) {
                const p = results[0];
                const include = p.types.includes("establishment") || p.types.includes("point_of_interest");
                const ignore = p.types.includes("political") || p.types.includes("locality");
                const clickPos = new google.maps.LatLng(latNum, lngNum);
                const placePos = p.geometry.location;

                const distance = google.maps.geometry.spherical.computeDistanceBetween(clickPos, placePos);
                if (!include || ignore || distance > 10) { p.name = "取得できませんでした。" }
                const d = new Date();

                const initialLocationId = (d.getHours() * 10000000) + (d.getMinutes() * 100000) + (d.getSeconds() * 1000) + d.getMilliseconds();
                const newModal = {
                    id: place?.id || initialLocationId,
                    tempId: initialLocationId,
                    pos: { x: x + 40, y: y, xCheck: xCheck, yCheck: yCheck },
                    currentPos: { x: x + 40, y: y + 40, },
                    data: place || {
                        name: p.name,
                        comment: "",
                        latitude: latLng.lat(),
                        longitude: latLng.lng(),
                        isNew: true
                    },
                };
                setOpenedModalLocations((prev: any[]) => {
                    if (prev.find(m =>
                        m.id === newModal.id
                        || (m.data.latitude === newModal.data.latitude
                            && m.data.longitude === newModal.data.longitude)
                    )) {
                        return prev;
                    }
                    return [...prev, newModal];
                });

                const allValues = openedModalLocations.flatMap((m: any) => [
                    Number(m.locations?.zIndexValue) || 1000,
                    Number(m.google?.zIndexValue) || 1000,
                    Number(m.log?.zIndexValue) || 1000,
                    ...(m.comments || []).map((c: any) => Number(c.zIndexValue) || 1000)
                ]);
                const nextZ = Math.max(1000, ...allValues);


                setOpenedModalLocations((prev: any[]) => {
                    return prev.map((m: any) =>
                        m.id === newModal.id
                            ? {
                                ...m,
                                data: {
                                    ...m.data,
                                    isCurrentMarker: m.data.isCurrentMarker ? false : true,
                                    isRedFootMark: true,
                                },
                                locations: {
                                    zIndexvalue: nextZ
                                }

                            }
                            : m
                    );
                });


            } else {
                const newModal = {
                    id: place?.id || initialLocationId,
                    tempId: Date.now,
                    pos: { x: x, y: y, xCheck: xCheck, yCheck: yCheck },
                    currentPos: { x: x + 40, y: y + 40 },
                    data: place || { name: "取得できませんでした", comment: "", latitude: latLng.lat(), longitude: latLng.lng() },
                };
                setOpenedModalLocations((prev: any[]) => {
                    if (prev.find(m =>
                        m.id === newModal.id
                        || (m.data.latitude === newModal.data.latitude
                            && m.data.longitude === newModal.data.longitude)
                    )) {
                        return prev;
                    }
                    return [...prev, newModal];
                });

                const allValues = openedModalLocations.flatMap((m: any) => [
                    Number(m.locations?.zIndexValue) || 1000,
                    Number(m.google?.zIndexValue) || 1000,
                    Number(m.log?.zIndexValue) || 1000,
                    ...(m.comments || []).map((c: any) => Number(c.zIndexValue) || 1000)
                ]);
                const nextZ = Math.max(1000, ...allValues);


                setOpenedModalLocations((prev: any[]) => {
                    return prev.map((m: any) =>
                        m.id === newModal.id
                            ? {
                                ...m,
                                data: {
                                    ...m.data,
                                    isCurrentMarker: m.data.isCurrentMarker ? false : true,
                                    isRedFootMark: true
                                },
                                locations: {
                                    zIndexvalue: nextZ
                                }
                            }
                            : m
                    );
                });
            }
        });
    };
    const handleMarkerClick = async (place?: any, latLng?: any, domEvent?: any) => {

        let x = domEvent?.clientX || domEvent?.touches?.[0]?.clientX;
        let y = domEvent?.clientY || domEvent?.touches?.[0]?.clientY;

        let xCheck
        let yCheck

        if (x === undefined) {
            const projection = map.getProjection();
            const bounds = map.getBounds();

            if (projection && bounds) {
                const nw = new google.maps.LatLng(
                    bounds.getNorthEast().lat(),
                    bounds.getSouthWest().lng()
                );
                const nwPoint = projection.fromLatLngToPoint(nw)!;
                const clickPoint = projection.fromLatLngToPoint(latLng)!;
                const scale = Math.pow(2, map.getZoom()!);

                x = (clickPoint.x - nwPoint.x) * scale;
                y = (clickPoint.y - nwPoint.y) * scale;
                xCheck = x;
                yCheck = y;
            }
        }

        const ax = window.innerWidth;
        const ay = window.innerHeight;
        const bx = 260;
        const by = 380;

        if (x < 0) {
            x = 0; // 左端固定
        } else if (x + bx > ax) {
            x = ax - bx - 30; // 右端固定
        }

        if (y < by) {
            y = by + 0; // 上端固定 
        } else if (y > ay) {
            y = ay; // 下端固定
        }

        try {
            const response = await fetch(`/api/get_location?id=${place.id}`, {
                method: "GET",
                cache: "no-store"
            });
            if (!response.ok) {
                if (response.status === 401) {
                    console.warn("⚠️ セッションが切れているか未ログインです");
                }
                throw new Error(`APIエラー: ステータスコード ${response.status}`);
            }
            const locationArray = await response.json();

            let target: any
            if (locationArray && locationArray.length > 0) {
                target = locationArray[0];

            } else { target = null }
            const newModal = {
                id: place?.id || initialLocationId,
                pos: { x: x, y: y, xCheck: xCheck, yCheck: yCheck },
                currentPos: { x: x + 40, y: y + 40 },

                data:
                {
                    id: target.id,
                    name: target?.name,
                    comment: target?.comment,
                    latitude: latLng.lat(),
                    longitude: latLng.lng(),
                    isNew: false  
                },
            };

            setOpenedModalLocations((prev: any) => {
                if (prev.find((m: any) => m.id === newModal.id)) return prev;
                return [...prev, newModal];
            });

            const allValues = openedModalLocations.flatMap((m: any) => [
                Number(m.locations?.zIndexValue) || 1000,
                Number(m.google?.zIndexValue) || 1000,
                Number(m.log?.zIndexValue) || 1000,
                ...(m.comments || []).map((c: any) => Number(c.zIndexValue) || 1000)
            ]);
            const nextZ = Math.max(1000, ...allValues);


            setOpenedModalLocations((prev: any[]) => {
                return prev.map((m: any) =>
                    m.id === newModal.id
                        ? {
                            ...m,
                            data: {
                                ...m.data,
                                isCurrentMarker: m.data.isCurrentMarker ? false : true,
                                isRedFootMark: false

                            },
                            locations: {
                                zIndexvalue: nextZ
                            }
                        }
                        : m
                );
            });


        } catch (error) {
            console.error("🚨 フロント側でのピン単眼鏡取得フェッチに失敗しました:", error);
            return null;
        }

    };
    return (
        <div style={{ height: "100vh", width: "100%" }}>
            <Map
                mapId="DEMO_MAP_ID"
                center={currentPosOfCamera}
                zoom={currentZoom}
                onZoomChanged={(ev) => {
                    setCurrentZoom(ev.detail.zoom);
                }}

                onCameraChanged={(ev) => {
                    setCurrentPosOfCamera(ev.detail.center)
                    if (!isDesktop) {
                        setRedMarkerPos(ev.detail.center);
                    }
                }
                }

                mapTypeControl={isDesktop}
                gestureHandling={'greedy'}
                disableDefaultUI={false}
                zoomControl={true}
                cameraControl={false}
                disableDoubleClickZoom={true}
                clickableIcons={false}

            >

                {!isDesktop && (
                    <MapControl position={ControlPosition.TOP_LEFT}>
                        <HeaderMobile />
                    </MapControl>
                )}
                <AdvancedMarker
                    position={currentPosOfHome}
                    content={null}
                >
                    <div style={{ fontSize: '30px', transform: 'translateY(-15px)' }}>🚩</div>
                </AdvancedMarker>

                <AdvancedMarker
                    zIndex={1000}
                    collisionBehavior="OPTIONAL_AND_HIDES_LOWER_PRIORITY"
                    position={redMarkerPos}
                    gmpDraggable={isDesktop}
                    style={{ outline: 'none' }}
                    className="no-outline-marker"
                    onDragEnd={(ev: any) => {
                        const newLat = ev.latLng?.lat?.() || ev.detail?.latLng?.lat;
                        const newLng = ev.latLng?.lng?.() || ev.detail?.latLng?.lng;

                        if (newLat && newLng) {
                            setRedMarkerPos({ lat: newLat, lng: newLng });
                        }
                    }}

                    onClick={(ev: any) => {
                        const latLng = ev.detail?.latLng || ev.latLng;
                        const domEvent = ev.detail?.domEvent || ev.domEvent;
                        handleRedMarkerClick(null, latLng, domEvent);
                    }}>
                    <Pin
                        scale={0.9}
                        borderColor={'black'}

                    />
                </AdvancedMarker>

                {visitedLocations ? (visitedLocations.map((item: any) => {
                    const isCurrent = openedModalLocations.find(
                        (loc: any) => loc.id === item.id && loc.data?.isCurrentMarker
                    );
                    const keyword = (searchKeyword || "").trim().toLowerCase();
                    const isMatched = keyword !== "" && (item.name || "").toLowerCase().includes(keyword);
                    return (
                        <AdvancedMarker
                            key={item.id}
                            clickable={true}
                            className={isMatched ? "marker-blink" : ""}
                            position={{
                                lat: Number(item.latitude),
                                lng: Number(item.longitude)
                            }}
                            onClick={(ev: any) => {
                                const latLng = ev.detail?.latLng || ev.latLng;
                                const domEvent = ev.detail?.domEvent || ev.domEvent;
                                handleMarkerClick(item, latLng, domEvent)
                            }}
                        >
                            {isCurrent ? (
                                <Pin
                                    background={'#07f813c0'}
                                    glyphColor={'#d4d0df'}
                                    borderColor={'black'}
                                    glyphText={'👣'}
                                />

                            ) : (
                                <Pin
                                    background={'#FBBC04'}
                                    glyphColor={'#000000'}
                                    borderColor={'black'}
                                    glyphText={'👣'}
                                />
                            )
                            }
                        </AdvancedMarker>
                    )
                })) : (null)}
            </Map>
        </div >
    );
}
export default memo(MapContainer);