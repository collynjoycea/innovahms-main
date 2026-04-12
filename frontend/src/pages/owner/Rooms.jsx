import React, { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, AlertTriangle, X, Search, Image as ImageIcon, Users, CheckCircle } from 'lucide-react';
import resolveImg from '../../utils/resolveImg';

const Rooms = () => {
  const [notification, setNotification] = useState({ show: false, message: '' });
  const [rooms, setRooms] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [roomToDelete, setRoomToDelete] = useState(null);
  const [amenityInput, setAmenityInput] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [currentRoomId, setCurrentRoomId] = useState(null);
  
  // Updated Initial State
  const initialRoomData = { 
    roomNumber: '', 
    roomName: '',
    roomType: 'Single', 
    price: '',
    description: '',
    maxAdults: 2,
    maxChildren: 0,
    amenities: [],
    images: [] 
  };
  const [roomData, setRoomData] = useState(initialRoomData);

  const [filters, setFilters] = useState({ roomNumber: '', roomType: 'All', maxPrice: '', status: 'All' });

  const ownerSession = JSON.parse(localStorage.getItem('ownerSession'));
  const hotelId = ownerSession?.hotelId || ownerSession?.hotel_id || ownerSession?.id;

  const AMENITY_OPTIONS = ["Free Wi-Fi", "Air Conditioning", "Smart TV", "Mini Bar", "Coffee Maker", "Safe Box", "Balcony"];

  const showStatus = (msg) => {
    setNotification({ show: true, message: msg });
    setTimeout(() => setNotification({ show: false, message: '' }), 3000);
  };

  useEffect(() => { fetchRooms(); }, []);

  const fetchRooms = async () => {
    if (!hotelId) return;
    const res = await fetch(`/api/owner/rooms/${hotelId}`);
    const data = await res.json();
    if (res.ok) setRooms(Array.isArray(data) ? data : []);
  };

  const filteredRooms = rooms.filter(room => {
    const matchNumber = room.roomNumber.toLowerCase().includes(filters.roomNumber.toLowerCase());
    const matchType = filters.roomType === 'All' || room.roomType === filters.roomType;
    const matchStatus = filters.status === 'All' || (room.status || 'Available') === filters.status;
    const matchPrice = filters.maxPrice === '' || Number(room.price) <= Number(filters.maxPrice);
    return matchNumber && matchType && matchStatus && matchPrice;
  });

  const openAddModal = () => {
    setIsEditing(false);
    setRoomData(initialRoomData);
    setShowModal(true);
  };

  const openEditModal = (room) => {
    setIsEditing(true);
    setCurrentRoomId(room.id);
    setRoomData({
      roomNumber: room.roomNumber,
      roomName: room.roomName || '',
      roomType: room.roomType,
      price: room.price,
      description: room.description || '',
      maxAdults: room.maxAdults || 2,
      maxChildren: room.maxChildren || 0,
      amenities: room.amenities || [],
      images: room.images && room.images.length > 0 ? room.images : ['']
    });
    setShowModal(true);
  };

  const addAmenity = (e) => {
    if (e.key === 'Enter' && amenityInput.trim() !== '') {
      e.preventDefault();
      if (!roomData.amenities.includes(amenityInput.trim())) {
        setRoomData({
          ...roomData,
          amenities: [...roomData.amenities, amenityInput.trim()]
        });
      }
      setAmenityInput('');
    }
  };

  const removeAmenity = (amenityToRemove) => {
    setRoomData({
      ...roomData,
      amenities: roomData.amenities.filter(a => a !== amenityToRemove)
    });
  };

  const handleImageUpload = (e) => {
    const files = Array.from(e.target.files);
    setRoomData(prev => ({
      ...prev,
      images: [...prev.images, ...files]
    }));
  };

  const removeImage = (index) => {
    setRoomData(prev => ({
      ...prev,
      images: prev.images.filter((_, i) => i !== index)
    }));
  };

  const addImageField = () => setRoomData({ ...roomData, images: [...roomData.images, ''] });

const handleSubmit = async (e) => {
  e.preventDefault();
  
  try {
    const formData = new FormData();
    formData.append('hotelId', hotelId);
    formData.append('roomNumber', roomData.roomNumber);
    formData.append('roomName', roomData.roomName || '');
    formData.append('roomType', roomData.roomType);
    
    // Siguraduhing valid numbers ang ipapadala
    formData.append('price', parseFloat(roomData.price) || 0);
    formData.append('description', roomData.description || '');
    formData.append('maxAdults', parseInt(roomData.maxAdults) || 2);
    formData.append('maxChildren', parseInt(roomData.maxChildren) || 0);

    // FIX PARA SA JSONB: I-convert ang array into JSON string
    // Ito ang papalit sa pgFormat `{}` logic mo dati
    formData.append('amenities', JSON.stringify(roomData.amenities)); 

    roomData.images.forEach((file) => {
      if (file instanceof File) {
        formData.append('images', file);
      } else if (typeof file === 'string' && file.trim() !== '') {
        formData.append('existing_images', file);
      }
    });
    const url = isEditing 
      ? `/api/owner/rooms/update/${currentRoomId}` 
      : `/api/owner/rooms/add`;
  
    const res = await fetch(url, {
      method: isEditing ? 'PUT' : 'POST',
      body: formData 
    });

    if (res.ok) { 
      setShowModal(false); 
      fetchRooms(); 
      setRoomData(initialRoomData); 

      const successMsg = isEditing 
        ? `Room ${roomData.roomNumber} updated successfully!` 
        : `Room ${roomData.roomNumber} created successfully!`;
      showStatus(successMsg);
    } else {
      const errorData = await res.json();
      alert("Error: " + errorData.error);
    }
  } catch (err) {
    console.error("Submission error:", err);
    alert("An unexpected error occurred.");
  }
};

  const getStatusStyles = (status) => {
    switch (status) {
      case 'Available': return 'bg-green-100 text-green-700 border-green-200 dark:bg-green-500/10 dark:text-green-300 dark:border-green-500/20';
      case 'Occupied': return 'bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-500/10 dark:text-blue-300 dark:border-blue-500/20';
      case 'Maintenance': return 'bg-red-100 text-red-700 border-red-200 dark:bg-red-500/10 dark:text-red-300 dark:border-red-500/20';
      default: return 'bg-gray-100 text-gray-700 border-gray-200 dark:bg-white/10 dark:text-slate-300 dark:border-white/10';
    }
  };

  const confirmDelete = async () => {
    if (!roomToDelete) return;
    try {
      const res = await fetch(`/api/owner/rooms/delete/${roomToDelete.id}`, { method: 'DELETE' });
      if (res.ok) {
        setRooms(rooms.filter(room => room.id !== roomToDelete.id));
        setShowDeleteModal(false);
        
        // Use the helper here too
        showStatus(`Room ${roomToDelete.roomNumber} deleted successfully.`);
        
        setRoomToDelete(null);
      }
    } catch (err) {
      console.error("Delete error:", err);
    }
  };

  return (
    <div className="min-h-screen bg-[#faf9f6] p-8 font-sans dark:bg-transparent dark:text-slate-100">
      <div className="flex justify-between items-center mb-8">
        <h1 className="font-serif text-2xl font-bold text-slate-800 dark:text-white">Rooms</h1>
        <button onClick={openAddModal} className="bg-[#bf9b30] text-white px-6 py-2.5 rounded-xl font-bold flex items-center gap-2 hover:brightness-110 shadow-lg">
          <Plus size={18} /> Add New Room
        </button>
      </div>

      {/* Filter Bar */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500" size={16} />
          <input type="text" placeholder="Search Room #..." className="w-full rounded-xl border border-black/5 bg-white py-2.5 pl-10 pr-4 text-sm outline-none dark:border-white/10 dark:bg-[#11151d] dark:text-slate-200 dark:placeholder:text-slate-500" value={filters.roomNumber} onChange={(e) => setFilters({...filters, roomNumber: e.target.value})} />
        </div>
        <select className="rounded-xl border border-black/5 bg-white px-4 py-2.5 text-sm outline-none dark:border-white/10 dark:bg-[#11151d] dark:text-slate-200" value={filters.roomType} onChange={(e) => setFilters({...filters, roomType: e.target.value})}>
            <option value="All">All Types</option>
            {['Single', 'Double', 'Suite', 'Deluxe'].map(t => <option key={t} value={t}>{t}</option>)}
        </select>
        <select className="rounded-xl border border-black/5 bg-white px-4 py-2.5 text-sm outline-none dark:border-white/10 dark:bg-[#11151d] dark:text-slate-200" value={filters.status} onChange={(e) => setFilters({...filters, status: e.target.value})}>
            <option value="All">All Statuses</option>
            {['Available', 'Occupied', 'Maintenance', 'Cleaning'].map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400 dark:text-slate-500">MAX ₱</span>
          <input type="number" placeholder="Price" className="w-full rounded-xl border border-black/5 bg-white py-2.5 pl-16 pr-4 text-sm dark:border-white/10 dark:bg-[#11151d] dark:text-slate-200 dark:placeholder:text-slate-500" value={filters.maxPrice} onChange={(e) => setFilters({...filters, maxPrice: e.target.value})} />
        </div>
      </div>

      {/* Table Section */}
      <div className="overflow-hidden rounded-3xl border border-black/5 bg-white shadow-sm dark:border-white/10 dark:bg-[#11151d] dark:shadow-none">
        <table className="w-full text-left">
          <thead className="border-b border-black/5 bg-slate-50 dark:border-white/10 dark:bg-[#0d1118]">
            <tr>
              <th className="px-6 py-4 text-xs font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500">Room Info</th>
              <th className="px-6 py-4 text-xs font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500">Capacity</th>
              <th className="px-6 py-4 text-xs font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500">Price / Night</th>
              <th className="px-6 py-4 text-xs font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500">Status</th>
              <th className="px-6 py-4 text-right text-xs font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-black/5 dark:divide-white/10">
            {filteredRooms.map((room) => (
              <tr key={room.id} className="transition-colors hover:bg-slate-50/50 dark:hover:bg-white/[0.03]">
                <td className="px-6 py-4">
                  <div className="flex items-center gap-4">
                    <div className="h-12 w-12 flex-shrink-0 overflow-hidden rounded-lg border border-black/5 bg-slate-100 dark:border-white/10 dark:bg-[#0d1118]">
                      {room.images?.[0] ? (
                        <img
                          src={resolveImg(room.images[0])}
                          className="w-full h-full object-cover"
                          alt=""
                          onError={(e) => { e.target.src = '/images/room1.jpg'; }}
                        />
                      ) : (
                        <ImageIcon className="m-auto h-full text-slate-300" />
                      )}
                    </div>
                    <div>
                      <div className="font-bold text-slate-800 dark:text-white">Room {room.roomNumber}</div>
                      <div className="text-sm text-slate-500 dark:text-slate-400">{room.roomName || room.roomType}</div>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 text-xs text-slate-600 dark:text-slate-300">
                    <div className="flex items-center gap-2">{room.maxAdults} Adults</div>
                    <div className="flex items-center gap-2">{room.maxChildren} Kids</div>
                </td>
                <td className="px-6 py-4 font-serif font-bold text-[#bf9b30]">₱{Number(room.price).toLocaleString()}</td>
                <td className="px-6 py-4">
                  <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase border ${getStatusStyles(room.status)}`}>
                    {room.status || 'Available'}
                  </span>
                </td>
                <td className="px-6 py-4 text-right">
                  <div className="flex justify-end gap-3 text-slate-400 dark:text-slate-500">
                    <button onClick={() => openEditModal(room)} className="hover:text-blue-500"><Edit size={18} /></button>
                    <button onClick={() => { setRoomToDelete(room); setShowDeleteModal(true); }} className="hover:text-red-500"><Trash2 size={18} /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* ADD/EDIT MODAL */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="max-h-[90vh] w-full max-w-4xl overflow-y-auto rounded-[2rem] bg-white p-8 shadow-2xl dark:bg-[#11151d] dark:text-slate-100">
            <div className="flex justify-between items-center mb-6">
                <h2 className="font-serif text-2xl font-bold text-slate-800 dark:text-white">{isEditing ? 'Update Room' : 'New Room Registration'}</h2>
                <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-white"><X size={24} /></button>
            </div>
            
            <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* Left Column: Basic Details */}
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="mb-1 block text-xs font-bold uppercase text-slate-400 dark:text-slate-500">Room #</label>
                        <input type="text" value={roomData.roomNumber} required className="w-full rounded-xl border border-slate-200 p-3 outline-none dark:border-white/10 dark:bg-[#0d1118] dark:text-slate-200" onChange={e => setRoomData({...roomData, roomNumber: e.target.value})} />
                    </div>
                    <div>
                        <label className="mb-1 block text-xs font-bold uppercase text-slate-400 dark:text-slate-500">Room Name</label>
                        <input type="text" value={roomData.roomName} placeholder="e.g. Deluxe Garden" className="w-full rounded-xl border border-slate-200 p-3 outline-none dark:border-white/10 dark:bg-[#0d1118] dark:text-slate-200 dark:placeholder:text-slate-500" onChange={e => setRoomData({...roomData, roomName: e.target.value})} />
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="mb-1 block text-xs font-bold uppercase text-slate-400 dark:text-slate-500">Type</label>
                        <select value={roomData.roomType} className="w-full rounded-xl border border-slate-200 bg-white p-3 dark:border-white/10 dark:bg-[#0d1118] dark:text-slate-200" onChange={e => setRoomData({...roomData, roomType: e.target.value})}>
                            {['Single', 'Double', 'Suite', 'Deluxe'].map(t => <option key={t} value={t}>{t}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="mb-1 block text-xs font-bold uppercase text-slate-400 dark:text-slate-500">Price / Night</label>
                        <input type="number" value={roomData.price} required className="w-full rounded-xl border border-slate-200 p-3 outline-none dark:border-white/10 dark:bg-[#0d1118] dark:text-slate-200" onChange={e => setRoomData({...roomData, price: e.target.value})} />
                    </div>
                </div>

                <div>
                  <label className="mb-1 block text-xs font-bold uppercase text-slate-400 dark:text-slate-500">Capacity</label>
                  <div className="flex gap-4 rounded-xl border border-black/5 bg-slate-50 p-3 dark:border-white/10 dark:bg-[#0d1118]">
                    {/* Adults Input */}
                    <div className="flex flex-1 items-center justify-between px-2">
                      <div className="flex flex-col">
                        <span className="mb-1 text-[10px] font-bold uppercase leading-none text-slate-400 dark:text-slate-500">Adults</span>
                        <span className="text-[9px] font-medium text-slate-300 dark:text-slate-600">Ages 18+</span>
                      </div>
                      <input 
                        type="number" 
                        min="1"
                        className="w-12 bg-transparent text-right font-bold text-slate-700 outline-none focus:text-[#bf9b30] dark:text-slate-200" 
                        value={roomData.maxAdults} 
                        onChange={e => setRoomData({...roomData, maxAdults: e.target.value})} 
                      />
                    </div>

                    {/* Divider */}
                    <div className="h-8 w-px self-center bg-slate-200 dark:bg-white/10"></div>

                    {/* Children Input */}
                    <div className="flex flex-1 items-center justify-between px-2">
                      <div className="flex flex-col">
                        <span className="mb-1 text-[10px] font-bold uppercase leading-none text-slate-400 dark:text-slate-500">Children</span>
                        <span className="text-[9px] font-medium text-slate-300 dark:text-slate-600">Ages 0-17</span>
                      </div>
                      <input 
                        type="number" 
                        min="0"
                        className="w-12 bg-transparent text-right font-bold text-slate-700 outline-none focus:text-[#bf9b30] dark:text-slate-200" 
                        value={roomData.maxChildren} 
                        onChange={e => setRoomData({...roomData, maxChildren: e.target.value})} 
                      />
                    </div>
                  </div>
                </div>

                <div>
                    <label className="mb-1 block text-xs font-bold uppercase text-slate-400 dark:text-slate-500">Description</label>
                    <textarea rows="4" className="w-full resize-none rounded-xl border border-slate-200 p-3 outline-none dark:border-white/10 dark:bg-[#0d1118] dark:text-slate-200" value={roomData.description} onChange={e => setRoomData({...roomData, description: e.target.value})}></textarea>
                </div>
              </div>

              {/* Right Column: Amenities & Images */}
              <div className="space-y-4">
                <div>
                  <label className="mb-2 block text-xs font-bold uppercase text-slate-400 dark:text-slate-500">Amenities</label>
                  
                  {/* Input Field */}
                  <div className="relative mb-3">
                    <input 
                      type="text" 
                      placeholder="Type amenity and press Enter..." 
                      className="w-full rounded-xl border border-slate-200 p-3 outline-none transition-colors focus:border-[#bf9b30] dark:border-white/10 dark:bg-[#0d1118] dark:text-slate-200 dark:placeholder:text-slate-500"
                      value={amenityInput}
                      onChange={(e) => setAmenityInput(e.target.value)}
                      onKeyDown={addAmenity}
                    />
                    <Plus className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                  </div>

                  {/* Active Tags */}
                  <div className="flex flex-wrap gap-2 mb-4">
                    {roomData.amenities.map((amenity, idx) => (
                      <span key={idx} className="flex items-center gap-2 px-3 py-1.5 bg-[#bf9b30]/10 text-[#bf9b30] border border-[#bf9b30]/20 rounded-lg text-xs font-bold">
                        {amenity}
                        <button type="button" onClick={() => removeAmenity(amenity)} className="hover:text-red-500">
                          <X size={14} />
                        </button>
                      </span>
                    ))}
                  </div>

                  {/* Quick Suggestions (Optional) */}
                  <div className="space-y-2">
                    <p className="text-[10px] font-bold uppercase text-slate-400 dark:text-slate-500">Suggestions</p>
                    <div className="flex flex-wrap gap-2">
                      {AMENITY_OPTIONS.filter(opt => !roomData.amenities.includes(opt)).map(option => (
                        <button
                          key={option}
                          type="button"
                          onClick={() => setRoomData({...roomData, amenities: [...roomData.amenities, option]})}
                          className="rounded-full bg-slate-100 px-3 py-1 text-[10px] font-bold text-slate-500 transition-colors hover:bg-slate-200 dark:bg-[#0d1118] dark:text-slate-300 dark:hover:bg-white/10"
                        >
                          + {option}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <div>
                    <label className="mb-2 block text-xs font-bold uppercase text-slate-400 dark:text-slate-500">Upload Room Images</label>
                    <div className="space-y-4">
                        <input 
                            type="file" 
                            multiple 
                            accept="image/*"
                            className="hidden" 
                            id="room-images"
                            onChange={handleImageUpload} 
                        />
                        <label htmlFor="room-images" className="flex w-full cursor-pointer items-center justify-center rounded-xl border-2 border-dashed border-slate-200 p-4 transition-colors hover:bg-slate-50 dark:border-white/10 dark:hover:bg-white/5">
                            <div className="text-center">
                                <ImageIcon className="mx-auto text-slate-400 mb-2" />
                                <span className="text-xs font-bold text-[#bf9b30]">Click to upload photos</span>
                            </div>
                        </label>
                        
                        {/* Preview List */}
                        <div className="grid grid-cols-3 gap-2">
                            {roomData.images.map((file, idx) => {
                                // Determine the source
                                let imgSrc = "";
                                if (file instanceof File) {
                                    imgSrc = URL.createObjectURL(file);
                                } else if (typeof file === 'string' && file !== '') {
                                    imgSrc = resolveImg(file);
                                }

                                if (!imgSrc) return null;

                                return (
                                    <div key={idx} className="relative group aspect-square rounded-lg overflow-hidden border">
                                        <img 
                                            src={imgSrc} 
                                            className="w-full h-full object-cover" 
                                            alt="preview"
                                        />
                                        <button 
                                            type="button"
                                            onClick={() => removeImage(idx)}
                                            className="absolute top-1 right-1 p-1 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                                        >
                                            <X size={12} />
                                        </button>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>

                <div className="flex gap-3 pt-6">
                    <button type="button" onClick={() => setShowModal(false)} className="flex-1 rounded-xl py-3 font-bold text-slate-500 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-white/5">Cancel</button>
                    <button type="submit" className="flex-2 py-3 px-8 bg-[#bf9b30] text-white rounded-xl font-bold shadow-lg shadow-[#bf9b30]/20">
                        {isEditing ? 'Update Room' : 'Create Room'}
                    </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/40 p-6 backdrop-blur-md">
            <div className="relative w-full max-w-sm rounded-[2rem] bg-white p-8 shadow-2xl dark:bg-[#11151d] dark:text-slate-100">
                <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-red-100 text-red-600 dark:bg-red-500/10 dark:text-red-300"><AlertTriangle size={32} /></div>
                <h2 className="mb-2 font-serif text-2xl font-bold text-slate-800 dark:text-white">Remove Room?</h2>
                <p className="mb-8 text-sm text-slate-500 dark:text-slate-400">Deleting Room {roomToDelete?.roomNumber} is permanent.</p>
                <div className="flex flex-col gap-2">
                    <button onClick={confirmDelete} className="w-full py-4 bg-red-500 text-white rounded-2xl font-bold shadow-lg">Confirm Deletion</button>
                    <button onClick={() => setShowDeleteModal(false)} className="w-full py-4 font-bold text-slate-500 dark:text-slate-300">Cancel</button>
                </div>
            </div>
        </div>
      )}

      {/* Success Notification */}
      {notification.show && (
        <div className="fixed bottom-8 right-8 flex items-center gap-3 bg-slate-900 text-white px-6 py-4 rounded-2xl shadow-2xl z-[100] animate-in slide-in-from-bottom-5 duration-300">
          <div className="bg-green-500 p-1 rounded-full">
            <CheckCircle size={18} className="text-white" />
          </div>
          <span className="text-sm font-bold">{notification.message}</span>
          <button 
            onClick={() => setNotification({ show: false, message: '' })}
            className="ml-4 text-slate-400 hover:text-white"
          >
            <X size={16} />
          </button>
        </div>
      )}
    </div>
  );
};

export default Rooms;
