import React, { useState, useEffect, useRef } from "react";
import { BrowserMultiFormatReader } from '@zxing/browser';

interface Item {
    id: number;
    name: string;
    quantity: number;
    barcode?: string;
}

interface SnackbarState {
    open: boolean;
    message: string;
    severity: "success" | "error" | "info" | "warning";
}

// api functions
const api = {
    getItems: async (): Promise<Item[]> => {   
        await new Promise(resolve => setTimeout(resolve, 1000));
        return JSON.parse(localStorage.getItem('items') || '[]');
    },

    addItem: async (item: Omit<Item, 'id'>): Promise<Item> => {
        const items = await api.getItems();
        const newItem = { ...item, id: Date.now() };
        localStorage.setItem('items', JSON.stringify([...items, newItem]));
        return newItem;
    },

    updateItem: async (item: Item): Promise<Item> => {
        const items = await api.getItems();
        const updatedItems = items.map(i => i.id === item.id ? item : i);
        localStorage.setItem('items', JSON.stringify(updatedItems));
        return item;
    },

    deleteItem: async (id: number): Promise<void> => {
        const items = await api.getItems();
        const updatedItems = items.filter(i => i.id !== id);
        localStorage.setItem('items', JSON.stringify(updatedItems));
    }
};

export default function InventoryApp() {
    const [items, setItems] = useState<Item[]>([]);
    const [filteredItems, setFilteredItems] = useState<Item[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [editItem, setEditItem] = useState<Item | null>(null);
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [, setSnackbar] = useState<SnackbarState>({open: false, message: "", severity: "success"});
    const [search, setSearch] = useState("");
    const [isScannerOpen, setIsScannerOpen] = useState(false);
    const barcodeInputRef = useRef<HTMLInputElement>(null);
    const videoRef = useRef<HTMLVideoElement>(null);
    const codeReaderRef = useRef<BrowserMultiFormatReader | null>(null);

    useEffect(() => {
        loadInventory();
    }, []);

    useEffect(() => {
        filterInventory();
    }, [items, search]);

    useEffect(() => {
        if (barcodeInputRef.current) {
            barcodeInputRef.current.focus();
        }
    }, [isDialogOpen]);

    useEffect(() => {
        if (isScannerOpen) {
            initScanner();
        }
        return () => {
            // Remove the codeReaderRef.current.reset() line
        };
    }, [isScannerOpen]);

    const loadInventory = async () => {
        try {
            setLoading(true);
            const items = await api.getItems();
            setItems(items);
        } catch (e) {
            setError('Error al cargar el inventario, si el error persiste contacte al administrador');
        } finally {
            setLoading(false);
        }
    };

    const filterInventory = () => {
        let filteredItems = items.filter(item => 
            item.name.toLowerCase().includes(search.toLowerCase()) ||
            (item.barcode && item.barcode.includes(search))
        );
        setFilteredItems(filteredItems);
    };

    const initScanner = async () => {
        if (videoRef.current) {
            codeReaderRef.current = new BrowserMultiFormatReader();
            try {
                const videoInputDevices = await BrowserMultiFormatReader.listVideoInputDevices();
                const selectedDeviceId = videoInputDevices[0].deviceId;
                
                codeReaderRef.current.decodeFromVideoDevice(selectedDeviceId, videoRef.current, (result, err) => {
                    if (result) {
                        handleBarcodeDetected(result.getText());
                        setIsScannerOpen(false);
                    }
                    if (err && !(err instanceof Error)) {
                        console.error(err);
                    }
                });
            } catch (err) {
                console.error(err);
                setSnackbar({ open: true, message: "Error al iniciar el escáner. Asegúrate de que tu dispositivo tiene una cámara y has dado los permisos necesarios.", severity: "error" });
            }
        }
    };

    const handleBarcodeDetected = (code: string) => {
        const item = items.find(item => item.barcode === code);
        if (item) {
            setEditItem(item);
        } else {
            setEditItem({ id: 0, name: "", quantity: 1, barcode: code });
        }
        setIsDialogOpen(true);
    };

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const formData = new FormData(e.currentTarget);
        const name = formData.get('name') as string;
        const quantity = Number(formData.get('quantity'));
        const barcode = formData.get('barcode') as string;

        if (name && quantity > 0) {
            if (editItem && editItem.id) {
                await api.updateItem({ ...editItem, name, quantity, barcode });
                setSnackbar({ open: true, message: "Item actualizado", severity: "success" });
            } else {
                await api.addItem({ name, quantity, barcode });
                setSnackbar({ open: true, message: "Item creado", severity: "success" });
            }
            loadInventory();
            setIsDialogOpen(false);
        }
    };

    const deleteItem = async (id: number) => {
        try {
            await api.deleteItem(id);
            loadInventory();
            setSnackbar({ open: true, message: "Item eliminado", severity: "success" });
        } catch {
            setSnackbar({ open: true, message: "Error al eliminar el item", severity: "error" });
        }
    };

    if (loading) return <p>Cargando...</p>;
    if (error) return <p>{error}</p>;

    return (
        <div className="flex flex-col items-center bg-slate-50 min-h-screen">
            <div className="flex flex-row space-x-16 mb-16 items-center bg-green-600 h-48 w-full rounded-b-xl shadow-lg justify-center">
                <h2 className="text-center text-2xl font-bold text-white">Inventario</h2>
            </div>

            <div className="w-full max-w-md px-4">
                <input 
                    type="search" 
                    placeholder="Buscar por nombre o código de barras" 
                    className="w-full border rounded-md h-10 px-3 mb-4" 
                    value={search} 
                    onChange={(e) => setSearch(e.target.value)}
                />

                <input
                    ref={barcodeInputRef}
                    type="text"
                    className="sr-only"
                    onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                            handleBarcodeDetected(e.currentTarget.value);
                            e.currentTarget.value = '';
                        }
                    }}
                    aria-label="Entrada de código de barras para escáner externo"
                />

                <div className="flex space-x-2 mb-4">
                    <button 
                        onClick={() => { setIsDialogOpen(true); setEditItem(null); }} 
                        className="bg-sky-600 p-2 rounded-md flex-grow text-white text-xl font-semibold"
                    >
                        <span>+</span> Agregar
                    </button>
                    <button
                        onClick={() => setIsScannerOpen(true)}
                        className="bg-purple-600 p-2 rounded-md flex-grow text-white text-xl font-semibold"
                    >
                        Escanear código
                    </button>
                </div>
            </div>

            {isDialogOpen && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
                    <div className="bg-white p-4 rounded-lg w-5/6 max-w-md shadow-lg">
                        <h3 className="text-center text-lg font-bold mb-4">
                            {editItem && editItem.id ? 'Editar Artículo' : 'Agregar Artículo'}
                        </h3>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <label htmlFor="name" className="block mb-1">Nombre</label>
                                <input 
                                    id="name" 
                                    name="name" 
                                    defaultValue={editItem?.name || ''} 
                                    required 
                                    className="w-full border rounded-md h-10 px-3"
                                />
                            </div>
                            <div>
                                <label htmlFor="quantity" className="block mb-1">Cantidad</label>
                                <input 
                                    id="quantity" 
                                    name="quantity" 
                                    type="number" 
                                    defaultValue={editItem?.quantity || 1} 
                                    required 
                                    min="1" 
                                    className="w-full border rounded-md h-10 px-3"
                                />
                            </div>
                            <div>
                                <label htmlFor="barcode" className="block mb-1">Código de barras</label>
                                <input 
                                    id="barcode" 
                                    name="barcode" 
                                    defaultValue={editItem?.barcode || ''} 
                                    className="w-full border rounded-md h-10 px-3"
                                />
                            </div>
                            <div className="flex justify-between">
                                <button 
                                    type="submit" 
                                    className="bg-blue-600 px-4 py-2 rounded-lg text-white font-bold"
                                >
                                    {editItem && editItem.id ? 'Actualizar' : 'Agregar'}
                                </button>
                                <button 
                                    type="button"
                                    onClick={() => setIsDialogOpen(false)} 
                                    className="bg-red-600 px-4 py-2 rounded-lg text-white font-bold"
                                >
                                    Cancelar
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {isScannerOpen && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
                    <div className="bg-white p-4 rounded-lg w-full max-w-md">
                        <h3 className="text-lg font-bold mb-4">Escanear código de barras</h3>
                        <div className="relative w-full h-64">
                            <video ref={videoRef} className="w-full h-full object-cover" />
                        </div>
                        <button
                            onClick={() => setIsScannerOpen(false)}
                            className="mt-4 bg-red-500 text-white px-4 py-2 rounded-md w-full"
                        >
                            Cerrar
                        </button>
                    </div>
                </div>
            )}

            <div className="mt-8 bg-white p-8 w-full max-w-md shadow-md rounded-lg">
                {filteredItems.map((item) => (
                    <div key={item.id}>
                        <div className="flex justify-between items-center mb-2">
                            <div>
                                <h4 className="font-bold">{item.name}</h4>
                                <p className="text-gray-600">Cantidad: {item.quantity}</p>
                                {item.barcode && <p className="text-gray-600">Código: {item.barcode}</p>}
                            </div>
                            <div className="flex gap-2">
                                <button 
                                    className='bg-slate-500 p-2 rounded-md font-bold text-white'
                                    onClick={() => { setEditItem(item); setIsDialogOpen(true); }}
                                >
                                    Editar
                                </button>
                                <button 
                                    className="bg-red-600 p-2 rounded-md text-white"
                                    onClick={() => deleteItem(item.id)}
                                >
                                    Eliminar
                                </button>
                            </div>
                        </div>
                        <div className="border-b w-full my-2"></div>
                    </div>
                ))}
            </div>
        </div>
    );
}