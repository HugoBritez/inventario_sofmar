
import React, {useState, useEffect} from "react";


interface Item {
    id: number;
    name: string;
    quantity: number;
}

// api functions

const api = {
    getItems: async (): Promise<Item[]> => {   
        await new Promise(resolve => setTimeout(resolve, 1000))
        return JSON.parse(localStorage.getItem('items') || '[]')
    },

    addItem: async (item: Omit<Item, 'id'>): Promise<Item> => {
        const items = await api.getItems()
        const newItem = { ... item, id: Date.now() }
        localStorage.setItem('items', JSON.stringify([...items, newItem]))
        return newItem
    },

    updateItem: async (item: Item): Promise<Item> => {
        const items = await api.getItems()
        const updatedItems = items.map(i => i.id === item.id ? item : i)
        localStorage.setItem('items', JSON.stringify(updatedItems))
        return item
    },
    deleteItem: async (id: number): Promise<void> => {
        const items = await api.getItems()
        const updatedItems = items.filter(i => i.id !== id)
        localStorage.setItem('items', JSON.stringify(updatedItems))
    }
}

export default function InventoryApp() {
    const [items, setItems] = useState<Item[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [editItem,setEditItem] = useState<Item | null>(null);
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [snackbar, setSnackbar] = useState({open: false, message: "", severity: "success" as "success" | "error" | "info" | "warning"});
    const [search, setSearch] = useState("");
    
useEffect(() => {
    loadInventory();
}, []);

useEffect(() => {
    filterInventory();
}, [items, search]);

const loadInventory = async () => {
    try{
        setLoading(true)
        const items = await api.getItems()
        setItems(items)
    }catch(e){
        setError('Error al cargar el inventario, si el error persiste contacte al administrador')
    } finally {
        setLoading(false)
    }
}

const filterInventory = () => {
    let filteredItems = items
    if(search){
        filteredItems = items.filter(item => item.name.toLowerCase().includes(search.toLowerCase()))
    }
    setItems(filteredItems)
}

const handleSubmit = async(e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const formData= new FormData(e.currentTarget)
    const name = formData.get('name') as string
    const quantity = Number(formData.get('quantity'))


    if (name && quantity>0){
        if(editItem){
            await api.updateItem( {...editItem, name, quantity})
            setSnackbar({open: true, message: "Item actualizado", severity: "success"})
        }else{
            await api.addItem({name, quantity})
            setSnackbar({open: true, message: "Item creado", severity: "success"})
        }
        loadInventory()
        setIsDialogOpen(false)
    }
}

const deleteItem = async (id: number) => {
    try{
        await api.deleteItem(id)
        loadInventory()
        setSnackbar({open: true, message: "Item eliminado", severity: "success"})
    }catch{
        setSnackbar({open: true, message: "Error al eliminar el item", severity: "error"})
    }
}
if (loading) return <p>Cargando...</p>
if (error) return <p>{error}</p>

return (
    <div className="flex flex-col items-center bg-slate-50 h-full">
    <div className="flex flex-row space-x-16 mb-16 items-center bg-green-600 h-48 w-full rounded-b-xl shadow-lg justify-center">
      <h2 className="text-center  text-2xl font-bold text-white">Inventario</h2>
    </div>
    <button onClick={() => { setIsDialogOpen(true); setEditItem(null)}} 
        className="bg-sky-600 p-2 rounded-md fixed bottom-0 w-2/3 mb-4 text-white text-xl font-semibold">
        <span>+</span> Agregar
      </button>

    {isDialogOpen && (
      <div className="bg-white p-4 rounded-lg w-5/6 shadow-lg">
        <h3 className="text-center">{editItem ? 'Editar Artículo' : 'Agregar Artículo'}</h3>
        <form onSubmit={handleSubmit} className="space-y-8 flex flex-col items-center px-2">
          <div className="flex flex-col w-full space-y-2">
            <label htmlFor="name">Nombre</label>
            <input id="name" name="name" defaultValue={editItem?.name || ''} required  className="border rounded-md h-8"/>
          </div>
          <div className="flex flex-col w-full space-y-2">
            <label htmlFor="quantity">Cantidad</label>
            <input className="border rounded-md h-8" id="quantity" name="quantity" type="number" defaultValue={editItem?.quantity || 1} required min="1"/>
          </div>
          <div className="space-x-4">
          <button className="bg-blue-600 px-8 py-2 rounded-lg text-white font-bold "  type="submit">
            {editItem ? 'Actualizar' : 'Cargar'}
          </button>
          <button className="bg-red-600 px-8 py-2 rounded-lg text-white font-bold " onClick={() => setIsDialogOpen(false)}>
            Cancelar
            </button>
          </div>
        </form>
      </div>
    )}

    <div className="mt-8 bg-white p-8 w-5/6 shadow-md rounded-lg" >
      {items.map((item: Item) => (
        <div>
            <div className="flex flex-row justify-between space-y-2" key={item.id} >
          <div>
            <h4 className="font-bold">{item.name}</h4>
            <p className="text-gray-600">Cantidad: {item.quantity}</p>
          </div>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button  className='bg-slate-500 p-2 rounded-md font-bold text-white' onClick={() => { setEditItem(item); setIsDialogOpen(true); }}>
              Editar
            </button>
            <button className="bg-red-600 p-2 rounded-md text-white" onClick={() => deleteItem(item.id)}>
              Eliminar
            </button>
          </div>
        </div>
        <div className="border w-full my-2"></div>
        </div>
      ))}
    </div>
  </div>
)

}