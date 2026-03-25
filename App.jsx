import React, { useState, useRef } from 'react';
import { 
  Plus, 
  Search, 
  Calendar, 
  User, 
  Package, 
  FileText, 
  Paperclip, 
  Image as ImageIcon, 
  X, 
  CheckCircle,
  Clock,
  ChevronLeft,
  Download,
  Trash2,
  ListOrdered,
  Edit,
  AlertCircle,
  Lock,
  LogIn,
  LogOut,
  ClipboardList,
  CheckSquare,
  Tags,
  Users,
  Shield,
  Key
} from 'lucide-react';

const SHOE_SIZES = ['17/18', '19/20', '21/22', '23/24', '25/26', '27/28', '29/30', '31/32', '33/34', '35/36', '37/38', '39/40', '41/42', '43/44', '45/46'];

// ==========================================
// COLE AQUI A URL DO SEU GOOGLE APPS SCRIPT
// ==========================================
const GOOGLE_SHEETS_URL = 'https://script.google.com/macros/s/AKfycbwewS10sjZtViCKbE-5nWOu4mdR8hp7lcX05RNo4-xGu8f_3dfdECe6vlzht3YoUZSwjA/exec'; 

export default function App() {
  // Autenticação
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authMode, setAuthMode] = useState('login'); // 'login', 'register' ou 'admin'
  const [loginPassword, setLoginPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  // Estados de Cadastro
  const [registeredUsers, setRegisteredUsers] = useState(() => {
    try {
      const saved = localStorage.getItem('brindes_os_users');
      return saved ? JSON.parse(saved) : {};
    } catch (e) {
      return {};
    }
  });
  
  const [regFullName, setRegFullName] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regConfirmPassword, setRegConfirmPassword] = useState('');
  const [regUsername, setRegUsername] = useState('');

  // Lista dinâmica de utilizadores (apenas os cadastrados, Admin fica oculto)
  const usersList = Object.keys(registeredUsers);

  // Utilizador logado no sistema
  const [currentUser, setCurrentUser] = useState(usersList.length > 0 ? usersList[0] : '');

  // Produtos Cadastrados - Apenas Chinelo por padrão
  const [productTypes, setProductTypes] = useState(() => {
    try {
      const saved = localStorage.getItem('brindes_os_products');
      if (saved) {
        const parsed = JSON.parse(saved);
        // Se ainda tiver a lista antiga de exemplo com Copo, reseta para apenas Chinelo
        if (parsed.includes('Copo / Caneca')) {
          const onlyChinelo = ['Chinelo'];
          localStorage.setItem('brindes_os_products', JSON.stringify(onlyChinelo));
          return onlyChinelo;
        }
        return parsed;
      }
      return ['Chinelo'];
    } catch (e) {
      return ['Chinelo'];
    }
  });
  const [newProduct, setNewProduct] = useState('');
  const [productMessage, setProductMessage] = useState({ type: '', text: '' });

  // Estados da Administração de Utilizadores
  const [userToDelete, setUserToDelete] = useState(null);
  const [userToReset, setUserToReset] = useState(null);
  const [newResetPassword, setNewResetPassword] = useState('');
  const [adminMessage, setAdminMessage] = useState({ type: '', text: '' });

  // Estado principal: lista de ordens de serviço
  const [orders, setOrders] = useState([
    {
      id: '2026/03-0001',
      clientName: 'Tech Solutions Ltda',
      products: [
        {
          id: 1,
          type: 'Chinelo',
          quantity: '50',
          shoeSizes: { ...SHOE_SIZES.reduce((acc, size) => ({ ...acc, [size]: '' }), {}), '39/40': '50' }
        }
      ],
      deliveryDate: '2026-04-10',
      details: 'Chinelo personalizado com a logo da empresa. Correia branca e solado preto.',
      status: 'Em Produção',
      mockupPreview: 'https://images.unsplash.com/photo-1614251052140-59a4be356891?auto=format&fit=crop&q=80&w=400',
      artworkFile: null,
      createdAt: '2026-03-20T14:30:00.000Z',
      closedAt: null,
      openedBy: 'João (Vendas)',
      closedBy: null
    }
  ]);

  // Controle de navegação e Abas
  const [currentView, setCurrentView] = useState('list');
  const [activeTab, setActiveTab] = useState('ativas'); // 'ativas' ou 'concluidas'
  const [selectedOrder, setSelectedOrder] = useState(null);

  // Estados do Formulário
  const initialShoeSizes = SHOE_SIZES.reduce((acc, size) => ({ ...acc, [size]: '' }), {});
  
  const [formData, setFormData] = useState({
    clientName: '',
    deliveryDate: '',
    details: '',
    products: [{ id: Date.now(), type: productTypes[0] || 'Outro', quantity: '', shoeSizes: initialShoeSizes }]
  });
  const [mockupImage, setMockupImage] = useState(null);
  const [artworkFile, setArtworkFile] = useState(null);
  const [formError, setFormError] = useState('');

  // Função auxiliar para lidar com ordens antigas (compatibilidade)
  const getOrderProducts = (order) => {
    if (order.products && order.products.length > 0) return order.products;
    // Se for uma OS antiga, converte para o novo formato de lista
    return [{
      id: order.id + '-legacy',
      type: order.productType || 'Indefinido',
      quantity: order.quantity || '0',
      shoeSizes: order.shoeSizes || initialShoeSizes
    }];
  };

  const fileInputRef = useRef(null);
  const imageInputRef = useRef(null);

  // Obtém a data de hoje no formato YYYY-MM-DD ajustada ao fuso horário
  const getTodayDateString = () => {
    const d = new Date();
    const parts = new Intl.DateTimeFormat('en-GB', {
      timeZone: 'America/Cuiaba',
      year: 'numeric', month: '2-digit', day: '2-digit'
    }).formatToParts(d);
    
    const p = {};
    parts.forEach(({ type, value }) => { p[type] = value; });
    
    return `${p.year}-${p.month}-${p.day}`;
  };

  // Função para enviar os dados para o Google Sheets
  const syncWithGoogleSheets = async (orderData) => {
    if (!GOOGLE_SHEETS_URL) return; 
    
    const formatForSheets = (isoString) => {
      if (!isoString) return '';
      const d = new Date(isoString);
      
      const parts = new Intl.DateTimeFormat('en-GB', {
        timeZone: 'America/Cuiaba',
        year: 'numeric', month: '2-digit', day: '2-digit',
        hour: '2-digit', minute: '2-digit', second: '2-digit',
        hourCycle: 'h23'
      }).formatToParts(d);
      
      const p = {};
      parts.forEach(({ type, value }) => { p[type] = value; });
      
      return `${p.year}-${p.month}-${p.day} ${p.hour}:${p.minute}:${p.second}`;
    };

    const osProducts = getOrderProducts(orderData);

    try {
      const payload = {
        id: orderData.id,
        clientName: orderData.clientName,
        productType: osProducts.map(p => p.type).join(' + '),
        quantity: osProducts.map(p => p.quantity).join(' + '),
        status: orderData.status,
        createdAt: formatForSheets(orderData.createdAt),   
        openedBy: orderData.openedBy,     
        closedAt: formatForSheets(orderData.closedAt), 
        closedBy: orderData.closedBy || '',
        deliveryDate: orderData.deliveryDate // Mantido no payload para uso futuro, mas não afeta a planilha
      };

      await fetch(GOOGLE_SHEETS_URL, {
        method: 'POST',
        mode: 'no-cors', 
        headers: {
          'Content-Type': 'text/plain', 
        },
        body: JSON.stringify(payload)
      });
      console.log('OS Sincronizada com o Planilhas Google!', payload);
    } catch (error) {
      console.error('Erro ao sincronizar com Google Sheets:', error);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleProductChange = (id, field, value) => {
    setFormData(prev => ({
      ...prev,
      products: prev.products.map(p => {
        if (p.id === id) {
          const updatedProduct = { ...p, [field]: value };
          // Se mudar para Chinelo, atualiza a quantidade para bater com a soma da grade (se houver)
          if (field === 'type' && value.toLowerCase().includes('chinelo')) {
            const sum = Object.values(updatedProduct.shoeSizes || {}).reduce((acc, val) => acc + (parseInt(val) || 0), 0);
            updatedProduct.quantity = sum > 0 ? sum.toString() : '';
          }
          return updatedProduct;
        }
        return p;
      })
    }));
  };

  const handleShoeSizeChange = (id, size, value) => {
    setFormData(prev => ({
      ...prev,
      products: prev.products.map(p => {
        if (p.id === id) {
          const newShoeSizes = { ...p.shoeSizes, [size]: value };
          // Calcula a soma total da grade de numerações automaticamente
          const totalQuantity = Object.values(newShoeSizes).reduce((sum, val) => sum + (parseInt(val) || 0), 0);
          
          return { 
            ...p, 
            shoeSizes: newShoeSizes,
            quantity: totalQuantity > 0 ? totalQuantity.toString() : '' 
          };
        }
        return p;
      })
    }));
  };

  const addProduct = () => {
    setFormData(prev => ({
      ...prev,
      products: [...prev.products, { id: Date.now(), type: productTypes[0] || 'Outro', quantity: '', shoeSizes: initialShoeSizes }]
    }));
  };

  const removeProduct = (id) => {
    if (formData.products.length === 1) return;
    setFormData(prev => ({
      ...prev,
      products: prev.products.filter(p => p.id !== id)
    }));
  };

  const handlePaste = (e) => {
    const items = e.clipboardData?.items;
    if (!items) return;

    for (let i = 0; i < items.length; i++) {
      if (items[i].type.indexOf('image') !== -1) {
        const file = items[i].getAsFile();
        const reader = new FileReader();
        reader.onloadend = () => {
          setMockupImage(reader.result);
        };
        reader.readAsDataURL(file);
        e.preventDefault(); 
        break; 
      }
    }
  };

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setMockupImage(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setArtworkFile({
          name: file.name,
          size: (file.size / (1024 * 1024)).toFixed(2) + ' MB',
          type: file.type,
          data: reader.result
        });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setFormError('');

    if (!formData.clientName.trim() || !formData.deliveryDate) {
      setFormError('Por favor, preencha o nome do cliente e a data de entrega.');
      return;
    }

    if (!formData.products.every(p => p.quantity && parseInt(p.quantity) > 0)) {
      setFormError('Todos os produtos devem ter uma quantidade válida.');
      return;
    }
    
    const todayStr = getTodayDateString();
    if (formData.deliveryDate < todayStr) {
      setFormError('A data de entrega não pode ser anterior à data atual.');
      return;
    }

    if (!mockupImage) {
      setFormError('É obrigatório enviar a imagem de como vai ficar (Mockup).');
      return;
    }
    // Removida a obrigatoriedade do ficheiro de arte.
    
    for (const p of formData.products) {
      if (p.type.toLowerCase().includes('chinelo')) {
        const hasSizes = Object.values(p.shoeSizes).some(qty => parseInt(qty) > 0);
        if (!hasSizes) {
          setFormError(`Para o produto ${p.type}, é obrigatório informar a quantidade de pelo menos uma numeração.`);
          return;
        }
      }
    }
    
    const now = new Date();

    if (currentView === 'edit') {
      let updatedOrderData = null;
      const updatedOrders = orders.map(o => {
        if (o.id === selectedOrder.id) {
          updatedOrderData = { 
            ...o, 
            ...formData, 
            mockupPreview: mockupImage, 
            artworkFile: artworkFile 
          };
          return updatedOrderData;
        }
        return o;
      });
      
      setOrders(updatedOrders);
      setSelectedOrder(updatedOrderData);
      setCurrentView('view');
      
      if (updatedOrderData) syncWithGoogleSheets(updatedOrderData);
      
    } else {
      const year = now.getFullYear();
      const month = String(now.getMonth() + 1).padStart(2, '0');
      const newId = `${year}/${month}-${String(orders.length + 1).padStart(4, '0')}`;
      
      const newOrder = {
        id: newId,
        ...formData,
        status: 'Pendente',
        mockupPreview: mockupImage,
        artworkFile: artworkFile,
        createdAt: now.toISOString(),
        closedAt: null,
        openedBy: currentUser,
        closedBy: null
      };

      setOrders([newOrder, ...orders]);
      setCurrentView('list');
      setActiveTab('ativas'); 
      
      syncWithGoogleSheets(newOrder);
    }
    
    setFormData({
      clientName: '',
      deliveryDate: '',
      details: '',
      products: [{ id: Date.now(), type: productTypes[0] || 'Outro', quantity: '', shoeSizes: initialShoeSizes }]
    });
    setMockupImage(null);
    setArtworkFile(null);
  };

  const deleteOrder = (id) => {
    setOrders(orders.filter(o => o.id !== id));
    setCurrentView('list');
  };

  const handleStatusChange = (id, newStatus) => {
    const now = new Date().toISOString();
    const isClosing = newStatus === 'Concluído';
    const isReopening = newStatus === 'Reaberta';
    
    const orderToChange = orders.find(o => o.id === id);
    if (!orderToChange) return;

    if (isReopening && orderToChange.status === 'Concluído') {
      const baseId = orderToChange.id.split('-R')[0];
      const reabertaCount = orders.filter(existing => existing.id.startsWith(baseId + '-R')).length;
      const newId = `${baseId}-R${reabertaCount + 1}`;

      const newOrder = {
        ...orderToChange,
        id: newId,
        status: 'Reaberta',
        createdAt: now,          
        openedBy: currentUser,   
        closedAt: null,
        closedBy: null
      };

      setOrders([newOrder, ...orders]);
      setSelectedOrder(newOrder);
      syncWithGoogleSheets(newOrder);
      
      setActiveTab('ativas');
      return; 
    }

    let changedOrder = null;
    
    setOrders(orders.map(o => {
      if (o.id === id) {
        changedOrder = { 
          ...o, 
          status: newStatus, 
          closedAt: isClosing ? (o.closedAt || now) : null, 
          closedBy: isClosing ? (o.closedBy || currentUser) : null 
        };
        return changedOrder;
      }
      return o;
    }));
    
    setSelectedOrder(prev => {
      if (!prev || prev.id !== id) return prev;
      return changedOrder;
    });

    if (changedOrder) {
      syncWithGoogleSheets(changedOrder);
    }
  };

  const handleDownloadArtwork = (fileObj) => {
    if (!fileObj || !fileObj.data) return;
    const link = document.createElement('a');
    link.href = fileObj.data;
    link.download = fileObj.name;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getStatusColor = (status) => {
    switch(status) {
      case 'Pendente': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'Em Produção': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'Concluído': return 'bg-green-100 text-green-800 border-green-200';
      case 'Reaberta': return 'bg-orange-100 text-orange-800 border-orange-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const formatDateTime = (isoString) => {
    if (!isoString) return '';
    const d = new Date(isoString);
    return `${d.toLocaleDateString('pt-BR', { timeZone: 'America/Cuiaba' })} às ${d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Cuiaba' })}`;
  };

  const formatDateOnly = (dateString) => {
    if (!dateString) return '';
    const [year, month, day] = dateString.split('T')[0].split('-');
    return `${day}/${month}/${year}`;
  };

  const getDeliveryStatusStyles = (deliveryDateStr, status) => {
    if (status === 'Concluído') {
      return { bg: 'bg-gray-50', text: 'text-gray-600', border: 'border-gray-200', icon: 'text-gray-400' };
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [year, month, day] = deliveryDateStr.split('T')[0].split('-');
    const delivery = new Date(year, month - 1, day);
    delivery.setHours(0, 0, 0, 0);

    const diffTime = delivery.getTime() - today.getTime();
    const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays < 0) {
      return { bg: 'bg-red-50', text: 'text-red-800', border: 'border-red-200', icon: 'text-red-600' }; 
    } else if (diffDays === 1) {
      return { bg: 'bg-yellow-50', text: 'text-yellow-800', border: 'border-yellow-200', icon: 'text-yellow-600' }; 
    } else {
      return { bg: 'bg-green-50', text: 'text-green-800', border: 'border-green-200', icon: 'text-green-600' }; 
    }
  };

  // ==========================================
  // RENDERIZAÇÃO DAS TELAS
  // ==========================================

  const renderList = () => {
    const filteredOrders = orders.filter(order => {
      if (activeTab === 'ativas') return order.status !== 'Concluído';
      if (activeTab === 'concluidas') return order.status === 'Concluído';
      return true;
    });

    return (
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <h2 className="text-2xl font-bold text-gray-800">Ordens de Serviço</h2>
          <button 
            onClick={() => {
              setFormData({
                clientName: '',
                deliveryDate: '',
                details: '',
                products: [{ id: Date.now(), type: productTypes[0] || 'Outro', quantity: '', shoeSizes: initialShoeSizes }]
              });
              setMockupImage(null);
              setArtworkFile(null);
              setFormError('');
              setCurrentView('create');
            }}
            className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors shadow-sm"
          >
            <Plus size={20} />
            Nova OS
          </button>
        </div>

        <div className="flex border-b border-gray-200 overflow-x-auto hide-scrollbar">
          <button
            onClick={() => setActiveTab('ativas')}
            className={`flex items-center gap-2 py-3 px-6 text-sm font-semibold transition-colors border-b-2 whitespace-nowrap ${
              activeTab === 'ativas' 
                ? 'border-indigo-600 text-indigo-600 bg-indigo-50/50' 
                : 'border-transparent text-gray-500 hover:text-gray-800 hover:bg-gray-50'
            }`}
          >
            <ClipboardList size={18} />
            Em Andamento
            <span className={`ml-1 px-2 py-0.5 rounded-full text-xs ${activeTab === 'ativas' ? 'bg-indigo-100' : 'bg-gray-100 text-gray-500'}`}>
              {orders.filter(o => o.status !== 'Concluído').length}
            </span>
          </button>
          <button
            onClick={() => setActiveTab('concluidas')}
            className={`flex items-center gap-2 py-3 px-6 text-sm font-semibold transition-colors border-b-2 whitespace-nowrap ${
              activeTab === 'concluidas' 
                ? 'border-green-600 text-green-600 bg-green-50/50' 
                : 'border-transparent text-gray-500 hover:text-gray-800 hover:bg-gray-50'
            }`}
          >
            <CheckSquare size={18} />
            Concluídas
            <span className={`ml-1 px-2 py-0.5 rounded-full text-xs ${activeTab === 'concluidas' ? 'bg-green-100' : 'bg-gray-100 text-gray-500'}`}>
              {orders.filter(o => o.status === 'Concluído').length}
            </span>
          </button>
        </div>

        {filteredOrders.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-200 p-12 text-center text-gray-500 mt-6 shadow-sm">
            {activeTab === 'ativas' ? (
              <>
                <Package size={48} className="mx-auto mb-4 text-gray-300" />
                <p className="text-lg font-medium">Nenhuma Ordem de Serviço em andamento.</p>
                <p className="text-sm mt-1">Clique em "Nova OS" para começar a registar as suas encomendas.</p>
              </>
            ) : (
              <>
                <CheckCircle size={48} className="mx-auto mb-4 text-gray-300" />
                <p className="text-lg font-medium">Nenhuma Ordem de Serviço concluída ainda.</p>
                <p className="text-sm mt-1">Quando finalizar uma produção, ela aparecerá aqui.</p>
              </>
            )}
          </div>
        ) : (
          <div className="flex flex-wrap justify-center sm:justify-start gap-6 mt-6">
            {filteredOrders.map(order => (
              <div 
                key={order.id} 
                className="w-full sm:w-[360px] h-[550px] shrink-0 flex flex-col bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow overflow-hidden cursor-pointer"
                onClick={() => { setSelectedOrder(order); setCurrentView('view'); }}
              >
                <div className="h-[240px] shrink-0 bg-gray-50 relative w-full overflow-hidden p-2 flex items-center justify-center border-b border-gray-100">
                  {order.mockupPreview ? (
                    <img src={order.mockupPreview} alt="Mockup" className="max-w-full max-h-full object-contain drop-shadow-sm rounded" />
                  ) : (
                    <div className="flex items-center justify-center h-full text-gray-400">
                      <ImageIcon size={48} />
                    </div>
                  )}
                  <div 
                    className="absolute top-3 right-3"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <select
                      value={order.status}
                      onChange={(e) => handleStatusChange(order.id, e.target.value)}
                      className={`px-2.5 py-1 rounded-full text-xs font-bold border outline-none cursor-pointer shadow-sm ${getStatusColor(order.status)}`}
                    >
                      <option value="Pendente" className="bg-white text-gray-800">Pendente</option>
                      <option value="Em Produção" className="bg-white text-gray-800">Em Produção</option>
                      <option value="Concluído" className="bg-white text-gray-800">Concluído</option>
                      {(order.status === 'Concluído' || order.status === 'Reaberta') && (
                        <option value="Reaberta" className="bg-white text-gray-800">Reaberta</option>
                      )}
                    </select>
                  </div>
                </div>

                <div className="p-5 flex flex-col flex-1">
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="font-bold text-lg text-gray-900 truncate" title={order.clientName}>
                      {order.clientName}
                    </h3>
                    <span className="text-xs font-medium text-gray-500 bg-gray-100 px-2 py-1 rounded">
                      {order.id}
                    </span>
                  </div>
                  
                  <div className="mb-4">
                    {getOrderProducts(order).map((p, idx) => (
                      <p key={idx} className="text-sm text-gray-600 line-clamp-1 mb-1">
                        <span className="font-medium text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded mr-2">{p.quantity} un.</span>
                        <span className="font-medium">{p.type}</span>
                      </p>
                    ))}
                    {order.details && <p className="text-xs text-gray-500 mt-2 line-clamp-1 border-t border-gray-100 pt-1 border-dashed">{order.details}</p>}
                  </div>

                  <div className="mb-4 flex flex-col gap-2">
                    {(() => {
                      const dStyles = getDeliveryStatusStyles(order.deliveryDate, order.status);
                      return (
                        <div className={`flex items-center gap-2 text-sm font-bold p-2.5 rounded-lg border shadow-sm ${dStyles.bg} ${dStyles.text} ${dStyles.border}`}>
                          <Calendar size={16} className={dStyles.icon} />
                          <span>Entrega: {formatDateOnly(order.deliveryDate)}</span>
                        </div>
                      );
                    })()}
                    
                    <div className="flex flex-col gap-2 text-xs text-gray-600 bg-gray-50 p-2.5 rounded border border-gray-100">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5 truncate">
                          <User size={14} className="text-gray-400" />
                          <span>Por: <strong className="text-gray-800">{order.openedBy}</strong></span>
                        </div>
                        {order.artworkFile && (
                          <div className="flex items-center gap-1 text-indigo-600 font-semibold" title="Arte anexada">
                            <Paperclip size={14} />
                            <span>Arte</span>
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-1.5 text-gray-500">
                        <Clock size={12} className="text-gray-400" />
                        <span>Aberta em: {formatDateTime(order.createdAt)}</span>
                      </div>
                    </div>

                    {order.status === 'Concluído' && order.closedAt && (
                      <div className="mt-1 text-xs bg-green-50 text-green-800 p-2.5 rounded-lg border border-green-200 shadow-sm">
                        <div className="font-bold flex items-center gap-1.5 mb-1">
                          <CheckCircle size={14} className="text-green-600" /> 
                          Finalizada por: {order.closedBy}
                        </div>
                        <div className="pl-5 text-green-600 font-medium">
                          {formatDateTime(order.closedAt)}
                        </div>
                      </div>
                    )}
                  </div>

                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  const renderForm = () => (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center gap-4 mb-6">
        <button 
          onClick={() => setCurrentView(currentView === 'edit' ? 'view' : 'list')}
          className="p-2 text-gray-500 hover:bg-gray-100 rounded-full transition-colors"
        >
          <ChevronLeft size={24} />
        </button>
        <h2 className="text-2xl font-bold text-gray-800">
          {currentView === 'edit' ? `Editar Ordem de Serviço ${selectedOrder?.id}` : 'Criar Nova OS'}
        </h2>
      </div>

      {formError && (
        <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-center gap-3">
          <AlertCircle size={20} className="text-red-500 flex-shrink-0" />
          <p className="font-medium">{formError}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="p-6 md:p-8">
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-6">
              <h3 className="text-lg font-semibold text-gray-800 flex items-center gap-2 border-b pb-2">
                <User size={20} className="text-indigo-600"/> Dados da Encomenda
              </h3>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nome do Cliente</label>
                <input 
                  required
                  type="text" 
                  name="clientName"
                  value={formData.clientName}
                  onChange={handleInputChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                  placeholder="Ex: Empresa XYZ"
                />
              </div>

              <div className="border border-gray-200 rounded-xl overflow-hidden">
                <div className="bg-gray-50 px-4 py-3 border-b border-gray-200 flex justify-between items-center">
                  <h4 className="font-semibold text-gray-700 flex items-center gap-2">
                    <Package size={18} className="text-indigo-500" /> Produtos da Encomenda
                  </h4>
                </div>
                
                <div className="p-4 flex flex-col gap-4">
                  {formData.products.map((product, index) => (
                    <div key={product.id} className="relative bg-white border border-gray-100 p-4 rounded-lg shadow-sm">
                      {formData.products.length > 1 && (
                        <button 
                          type="button"
                          onClick={() => removeProduct(product.id)}
                          className="absolute top-2 right-2 text-gray-400 hover:text-red-500 transition-colors bg-white rounded-full p-1"
                          title="Remover este produto"
                        >
                          <X size={18} />
                        </button>
                      )}
                      
                      <div className="flex flex-col sm:flex-row gap-4 mb-2">
                        <div className="flex-1">
                          <label className="block text-xs font-medium text-gray-500 mb-1 uppercase tracking-wider">Tipo de Brinde {index + 1}</label>
                          <select 
                            value={product.type}
                            onChange={(e) => handleProductChange(product.id, 'type', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none bg-white text-sm"
                          >
                            {productTypes.map(prod => (
                              <option key={prod} value={prod}>{prod}</option>
                            ))}
                          </select>
                        </div>
                        <div className="w-full sm:w-32">
                          <label className="block text-xs font-medium text-gray-500 mb-1 uppercase tracking-wider">Quantidade</label>
                          <input 
                            required
                            type="number" 
                            min="1"
                            value={product.quantity}
                            onChange={(e) => handleProductChange(product.id, 'quantity', e.target.value)}
                            readOnly={product.type.toLowerCase().includes('chinelo')}
                            className={`w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-sm ${product.type.toLowerCase().includes('chinelo') ? 'bg-gray-100 text-gray-500 cursor-not-allowed' : ''}`}
                            placeholder="Ex: 100"
                            title={product.type.toLowerCase().includes('chinelo') ? "A quantidade é somada automaticamente através da grade de numerações" : ""}
                          />
                        </div>
                      </div>

                      {product.type.toLowerCase().includes('chinelo') && (
                        <div className="mt-4 bg-indigo-50 p-4 rounded-xl border border-indigo-100">
                          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 mb-4 border-b border-indigo-100 pb-3">
                            <h4 className="text-sm font-bold text-indigo-900 flex items-center gap-2">
                              <ListOrdered size={18} />
                              Grade de Numerações
                            </h4>
                            <div className="bg-indigo-600 text-white px-3 py-1.5 rounded-full text-xs font-bold flex items-center gap-1.5 shadow-sm">
                              Total calculado: <span className="text-sm">{product.quantity || 0}</span>
                            </div>
                          </div>
                          <p className="text-xs text-gray-600 mb-4 font-medium">
                            Preencha a quantidade apenas nas numerações desejadas (deixe o resto em branco).
                          </p>
                          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3">
                            {SHOE_SIZES.map(size => {
                              const hasValue = product.shoeSizes?.[size] && parseInt(product.shoeSizes[size]) > 0;
                              return (
                                <div key={size} className={`flex flex-col p-2.5 rounded-lg border transition-all ${hasValue ? 'bg-indigo-50 border-indigo-400 shadow-md ring-1 ring-indigo-400' : 'bg-white border-gray-200 hover:border-indigo-300 shadow-sm'}`}>
                                  <label className={`text-xs font-bold text-center mb-2 ${hasValue ? 'text-indigo-800' : 'text-gray-600'}`}>{size}</label>
                                  <input
                                    type="number"
                                    min="0"
                                    value={product.shoeSizes?.[size] || ''}
                                    onChange={(e) => handleShoeSizeChange(product.id, size, e.target.value)}
                                    className={`w-full px-2 py-2 text-center border rounded-md outline-none text-base font-bold transition-colors ${hasValue ? 'border-indigo-300 text-indigo-900 bg-white focus:ring-2 focus:ring-indigo-500' : 'border-gray-200 text-gray-800 bg-gray-50 focus:bg-white focus:border-indigo-400 focus:ring-2 focus:ring-indigo-200'}`}
                                    placeholder="0"
                                  />
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}

                  <button 
                    type="button"
                    onClick={addProduct}
                    className="flex items-center justify-center gap-2 w-full py-2.5 border-2 border-dashed border-indigo-200 text-indigo-600 rounded-lg hover:bg-indigo-50 font-medium transition-colors text-sm"
                  >
                    <Plus size={16} /> Adicionar outro Brinde
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Data de Entrega</label>
                <input 
                  required
                  type="date" 
                  name="deliveryDate"
                  value={formData.deliveryDate}
                  onChange={handleInputChange}
                  min={getTodayDateString()} 
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Detalhes e Observações Gerais (Opcional)</label>
                <textarea 
                  name="details"
                  value={formData.details}
                  onChange={handleInputChange}
                  rows="4"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none resize-none"
                  placeholder="Descreva o brinde, onde a logo será aplicada, cores da gravação, embalagem, etc."
                ></textarea>
              </div>
            </div>

            <div className="space-y-6">
              <h3 className="text-lg font-semibold text-gray-800 flex items-center gap-2 border-b pb-2">
                <ImageIcon size={20} className="text-indigo-600"/> Artes e Mockup
              </h3>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Imagem de como vai ficar (Mockup)</label>
                <div 
                  className={`border-2 border-dashed rounded-xl flex flex-col items-center justify-center p-4 transition-colors relative ${mockupImage ? 'border-indigo-500 bg-indigo-50' : 'border-gray-300 hover:border-indigo-400 bg-gray-50 focus:ring-2 focus:ring-indigo-300'} h-48 outline-none`}
                  onPaste={handlePaste}
                  tabIndex={0}
                >
                  {mockupImage ? (
                    <>
                      <img src={mockupImage} alt="Preview" className="h-full object-contain rounded" />
                      <button 
                        type="button"
                        onClick={(e) => {
                          e.preventDefault();
                          setMockupImage(null);
                        }}
                        className="absolute top-2 right-2 bg-red-500 text-white p-1.5 rounded-full hover:bg-red-600 shadow-sm z-10"
                      >
                        <X size={16} />
                      </button>
                    </>
                  ) : (
                    <>
                      <ImageIcon size={40} className="text-gray-400 mb-2" />
                      <p className="text-sm text-gray-600 text-center">Clique, arraste ou <strong className="text-indigo-600">cole (Ctrl+V)</strong> uma imagem aqui</p>
                      <p className="text-xs text-gray-400 mt-1">Apenas JPG, PNG</p>
                    </>
                  )}
                  <input 
                    type="file" 
                    accept="image/*"
                    ref={imageInputRef}
                    onChange={handleImageUpload}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    title=""
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Ficheiro da Arte do Cliente <span className="text-gray-400 text-xs font-normal">(Opcional)</span></label>
                <div className="border border-gray-300 rounded-xl p-4 bg-gray-50 relative">
                  {artworkFile ? (
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3 overflow-hidden">
                        <div className="bg-indigo-100 p-2 rounded-lg text-indigo-600">
                          <FileText size={24} />
                        </div>
                        <div className="truncate">
                          <p className="text-sm font-medium text-gray-800 truncate">{artworkFile.name}</p>
                          <p className="text-xs text-gray-500">{artworkFile.size}</p>
                        </div>
                      </div>
                      <button 
                        type="button"
                        onClick={() => setArtworkFile(null)}
                        className="p-2 text-gray-400 hover:text-red-500 transition-colors z-10 relative"
                      >
                        <X size={20} />
                      </button>
                    </div>
                  ) : (
                    <div className="text-center relative">
                      <Paperclip size={32} className="text-gray-400 mx-auto mb-2" />
                      <p className="text-sm text-gray-600">Anexar arte em qualquer formato</p>
                      <p className="text-xs text-gray-400 mt-1">(PDF, CDR, AI, EPS, ZIP, etc)</p>
                      <input 
                        type="file" 
                        ref={fileInputRef}
                        onChange={handleFileUpload}
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                        title=""
                      />
                    </div>
                  )}
                </div>
              </div>

            </div>
          </div>
        </div>
        
        <div className="bg-gray-50 px-6 py-4 border-t border-gray-200 flex justify-end gap-3">
          <button 
            type="button"
            onClick={() => setCurrentView(currentView === 'edit' ? 'view' : 'list')}
            className="px-6 py-2.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-100 font-medium transition-colors"
          >
            Cancelar
          </button>
          <button 
            type="submit"
            className="px-6 py-2.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-medium transition-colors shadow-sm flex items-center gap-2"
          >
            <CheckCircle size={20} />
            {currentView === 'edit' ? 'Salvar Alterações' : 'Gerar Ordem de Serviço'}
          </button>
        </div>
      </form>
    </div>
  );

  const renderOrderDetails = () => {
    if (!selectedOrder) return null;

    return (
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => setCurrentView('list')}
              className="p-2 text-gray-500 hover:bg-gray-100 rounded-full transition-colors"
            >
              <ChevronLeft size={24} />
            </button>
            <h2 className="text-2xl font-bold text-gray-800">Ordem de Serviço {selectedOrder.id}</h2>
          </div>
          <span className={`px-4 py-1.5 rounded-full text-sm font-semibold border ${getStatusColor(selectedOrder.status)}`}>
            {selectedOrder.status}
          </span>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          
          <div className="bg-indigo-600 p-6 text-white flex justify-between items-start">
            <div>
              <p className="text-indigo-200 text-sm mb-1">Cliente</p>
              <h1 className="text-3xl font-bold">{selectedOrder.clientName}</h1>
              <div className="mt-3 flex flex-col gap-1 text-sm text-indigo-100">
                <p>
                  Aberta em: <span className="font-medium text-white">{formatDateTime(selectedOrder.createdAt)}</span> por <span className="font-medium text-white">{selectedOrder.openedBy}</span>
                </p>
                {selectedOrder.closedAt && (
                  <p>
                    Finalizada em: <span className="font-medium text-green-300">{formatDateTime(selectedOrder.closedAt)}</span> por <span className="font-medium text-green-300">{selectedOrder.closedBy}</span>
                  </p>
                )}
              </div>
            </div>
            <div className="text-right">
              <p className="text-indigo-200 text-sm mb-1">Prazo de Entrega</p>
              <p className="text-xl font-semibold flex items-center gap-2 justify-end">
                <Clock size={20} />
                {formatDateOnly(selectedOrder.deliveryDate)}
              </p>
            </div>
          </div>

          <div className="p-8 grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="md:col-span-2 space-y-8">
              
              <section>
                <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-3">Produtos da Encomenda</h3>
                <div className="space-y-4">
                  {getOrderProducts(selectedOrder).map((p, idx) => (
                    <div key={idx} className="bg-gray-50 border border-gray-200 rounded-xl overflow-hidden shadow-sm">
                      <div className="flex bg-white p-4">
                        <div className="flex-1">
                          <p className="text-xs text-gray-500 font-bold uppercase tracking-wider mb-1">Item {idx + 1}</p>
                          <p className="text-lg font-semibold text-gray-800">{p.type}</p>
                        </div>
                        <div className="w-1/3 min-w-[100px] border-l border-gray-100 pl-4">
                          <p className="text-xs text-gray-500 font-bold uppercase tracking-wider mb-1">Quant.</p>
                          <p className="text-xl font-bold text-indigo-700">{p.quantity}</p>
                        </div>
                      </div>
                      
                      {p.type.toLowerCase().includes('chinelo') && p.shoeSizes && (
                        <div className="bg-indigo-50 p-4 border-t border-indigo-100">
                          <h4 className="text-xs font-bold text-indigo-800 uppercase tracking-wider flex items-center gap-1.5 mb-2">
                            <ListOrdered size={14} /> Grade de Numerações
                          </h4>
                          <div className="flex flex-wrap gap-2">
                            {Object.entries(p.shoeSizes).filter(([_, qty]) => parseInt(qty) > 0).map(([size, qty]) => (
                              <div key={size} className="text-center bg-white px-3 py-1.5 rounded border border-indigo-200 min-w-[50px] shadow-sm">
                                <div className="text-[10px] font-bold text-indigo-400 mb-0.5">{size}</div>
                                <div className="text-sm font-bold text-indigo-700">{qty}</div>
                              </div>
                            ))}
                            {Object.values(p.shoeSizes).every(qty => !qty || parseInt(qty) <= 0) && (
                              <p className="text-xs text-gray-500 italic">Nenhuma numeração informada.</p>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </section>

              <section>
                <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-3">Detalhes e Observações</h3>
                <p className="text-gray-700 whitespace-pre-wrap leading-relaxed">
                  {selectedOrder.details || "Nenhum detalhe adicional fornecido."}
                </p>
              </section>

              <section>
                <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-3">Ficheiro da Arte</h3>
                {selectedOrder.artworkFile ? (
                  <div className="flex items-center justify-between bg-indigo-50 border border-indigo-100 p-4 rounded-lg">
                    <div className="flex items-center gap-3">
                      <FileText size={24} className="text-indigo-600" />
                      <div>
                        <p className="font-medium text-gray-800">{selectedOrder.artworkFile.name}</p>
                        <p className="text-xs text-gray-500">{selectedOrder.artworkFile.size}</p>
                      </div>
                    </div>
                    <button 
                      onClick={() => handleDownloadArtwork(selectedOrder.artworkFile)}
                      className="flex items-center gap-2 text-sm font-medium text-indigo-600 hover:text-indigo-800 bg-white px-3 py-1.5 rounded border border-indigo-200"
                    >
                      <Download size={16} /> Baixar Arte
                    </button>
                  </div>
                ) : (
                  <p className="text-gray-500 italic">Nenhum ficheiro de arte anexado.</p>
                )}
              </section>
            </div>

            <div>
              <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-3">Visual (Mockup)</h3>
              {selectedOrder.mockupPreview ? (
                <div className="border border-gray-200 rounded-lg overflow-hidden shadow-sm">
                  <img src={selectedOrder.mockupPreview} alt="Como vai ficar" className="w-full h-auto object-cover" />
                </div>
              ) : (
                <div className="border-2 border-dashed border-gray-200 rounded-lg p-8 flex flex-col items-center justify-center text-gray-400 bg-gray-50">
                  <ImageIcon size={48} className="mb-2 opacity-50" />
                  <p className="text-sm text-center">Nenhuma imagem de referência fornecida.</p>
                </div>
              )}
            </div>
          </div>
          
          <div className="bg-gray-50 px-6 py-4 border-t border-gray-200 flex flex-col sm:flex-row justify-between items-center gap-4">
             <div className="flex items-center gap-2 w-full sm:w-auto">
               <button 
                  onClick={() => deleteOrder(selectedOrder.id)}
                  className="flex flex-1 sm:flex-none justify-center items-center gap-2 text-red-600 hover:bg-red-50 px-4 py-2 rounded-lg transition-colors font-medium"
                >
                  <Trash2 size={20} />
                  <span className="hidden sm:inline">Excluir</span>
                </button>
                <button 
                  onClick={() => {
                    setFormData({
                      clientName: selectedOrder.clientName,
                      deliveryDate: selectedOrder.deliveryDate,
                      details: selectedOrder.details,
                      products: getOrderProducts(selectedOrder)
                    });
                    setMockupImage(selectedOrder.mockupPreview);
                    setArtworkFile(selectedOrder.artworkFile);
                    setFormError('');
                    setCurrentView('edit');
                  }}
                  className="flex flex-1 sm:flex-none justify-center items-center gap-2 text-indigo-600 hover:bg-indigo-50 px-4 py-2 rounded-lg transition-colors font-medium"
                >
                  <Edit size={20} />
                  <span className="hidden sm:inline">Editar</span>
                </button>
             </div>
              
              <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-end border-t sm:border-t-0 pt-4 sm:pt-0 border-gray-200">
                <span className="text-sm font-medium text-gray-700">Status da Produção:</span>
                <select
                  value={selectedOrder.status}
                  onChange={(e) => handleStatusChange(selectedOrder.id, e.target.value)}
                  className={`px-4 py-2 rounded-lg font-bold border outline-none cursor-pointer appearance-none ${
                    selectedOrder.status === 'Concluído' ? 'bg-green-100 text-green-800 border-green-300' :
                    selectedOrder.status === 'Em Produção' ? 'bg-blue-100 text-blue-800 border-blue-300' :
                    selectedOrder.status === 'Reaberta' ? 'bg-orange-100 text-orange-800 border-orange-300' :
                    'bg-yellow-100 text-yellow-800 border-yellow-300'
                  }`}
                >
                  <option value="Pendente" className="bg-white text-gray-800">Pendente</option>
                  <option value="Em Produção" className="bg-white text-gray-800">Em Produção</option>
                  <option value="Concluído" className="bg-white text-gray-800">Concluído</option>
                  {(selectedOrder.status === 'Concluído' || selectedOrder.status === 'Reaberta') && (
                    <option value="Reaberta" className="bg-white text-gray-800">Reaberta</option>
                  )}
                </select>
              </div>
          </div>
        </div>
      </div>
    );
  };

  const handleAddProduct = (e) => {
    e.preventDefault();
    setProductMessage({type: '', text: ''});
    if (!newProduct.trim()) return;
    if (productTypes.includes(newProduct.trim())) {
      setProductMessage({type: 'error', text: 'Este produto já existe na lista.'});
      return;
    }
    const updated = [...productTypes, newProduct.trim()];
    setProductTypes(updated);
    localStorage.setItem('brindes_os_products', JSON.stringify(updated));
    setNewProduct('');
    setProductMessage({type: 'success', text: 'Produto adicionado com sucesso!'});
  };

  const handleDeleteProduct = (prod) => {
    setProductMessage({type: '', text: ''});
    if(productTypes.length === 1) {
      setProductMessage({type: 'error', text: 'Você precisa ter pelo menos um produto na lista.'});
      return;
    }
    const updated = productTypes.filter(p => p !== prod);
    setProductTypes(updated);
    localStorage.setItem('brindes_os_products', JSON.stringify(updated));
    setProductMessage({type: 'success', text: 'Produto removido com sucesso!'});
  };

  const renderProductsAdmin = () => (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center gap-4 mb-6">
        <button 
          onClick={() => setCurrentView('list')}
          className="p-2 text-gray-500 hover:bg-gray-100 rounded-full transition-colors"
        >
          <ChevronLeft size={24} />
        </button>
        <h2 className="text-2xl font-bold text-gray-800">Gerir Produtos</h2>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden p-6 md:p-8">
        {productMessage.text && (
          <div className={`mb-6 p-3 rounded-lg text-sm font-medium flex items-center gap-2 border ${productMessage.type === 'error' ? 'bg-red-50 text-red-600 border-red-100' : 'bg-green-50 text-green-700 border-green-200'}`}>
            {productMessage.type === 'error' ? <AlertCircle size={16} /> : <CheckCircle size={16} />}
            {productMessage.text}
          </div>
        )}

        <form onSubmit={handleAddProduct} className="flex gap-3 mb-8">
          <input 
            type="text"
            value={newProduct}
            onChange={(e) => setNewProduct(e.target.value)}
            placeholder="Novo produto (Ex: Boné)"
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
          />
          <button 
            type="submit"
            className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-medium transition-colors shadow-sm flex items-center gap-2"
          >
            <Plus size={20} />
            <span className="hidden sm:inline">Adicionar</span>
          </button>
        </form>

        <div className="space-y-3">
          <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-3">Produtos Cadastrados</h3>
          {productTypes.map(prod => (
            <div key={prod} className="flex items-center justify-between bg-gray-50 p-3 rounded-lg border border-gray-100">
              <span className="font-medium text-gray-700">{prod}</span>
              <button 
                onClick={() => handleDeleteProduct(prod)}
                className="p-2 text-red-500 hover:bg-red-50 rounded transition-colors"
                title="Excluir produto"
              >
                <Trash2 size={18} />
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  const handleConfirmDeleteUser = (username) => {
    const updated = { ...registeredUsers };
    delete updated[username];
    setRegisteredUsers(updated);
    localStorage.setItem('brindes_os_users', JSON.stringify(updated));
    setUserToDelete(null);
    setAdminMessage({ type: 'success', text: `Utilizador ${username} foi apagado com sucesso.` });
  };

  const handleConfirmResetPassword = (username) => {
    if (newResetPassword.length < 4) {
      setAdminMessage({ type: 'error', text: 'A nova senha deve ter pelo menos 4 caracteres.' });
      return;
    }
    const updated = { ...registeredUsers };
    updated[username].password = newResetPassword;
    setRegisteredUsers(updated);
    localStorage.setItem('brindes_os_users', JSON.stringify(updated));
    setUserToReset(null);
    setNewResetPassword('');
    setAdminMessage({ type: 'success', text: `A senha de ${username} foi alterada com sucesso.` });
  };

  const renderUsersAdmin = () => (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center gap-4 mb-6">
        <button 
          onClick={() => setCurrentView('list')}
          className="p-2 text-gray-500 hover:bg-gray-100 rounded-full transition-colors"
        >
          <ChevronLeft size={24} />
        </button>
        <h2 className="text-2xl font-bold text-gray-800">Gerir Contas de Utilizadores</h2>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden p-6 md:p-8">
        
        {adminMessage.text && (
          <div className={`mb-6 p-3 rounded-lg text-sm font-medium flex items-center gap-2 border ${adminMessage.type === 'error' ? 'bg-red-50 text-red-600 border-red-100' : 'bg-green-50 text-green-700 border-green-200'}`}>
            {adminMessage.type === 'error' ? <AlertCircle size={16} /> : <CheckCircle size={16} />}
            {adminMessage.text}
          </div>
        )}

        <div className="space-y-4">
          {Object.keys(registeredUsers).length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <Users size={48} className="mx-auto mb-3 opacity-20" />
              <p>Nenhuma conta de utilizador normal cadastrada no sistema.</p>
            </div>
          ) : (
            Object.keys(registeredUsers).map(username => {
              const isDeleting = userToDelete === username;
              const isResetting = userToReset === username;

              return (
                <div key={username} className="bg-gray-50 p-4 rounded-xl border border-gray-200 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                  <div>
                    <div className="font-bold text-gray-800 text-lg">{username}</div>
                    <div className="text-sm text-gray-500">{registeredUsers[username].fullName}</div>
                  </div>

                  <div className="flex flex-col sm:flex-row w-full sm:w-auto gap-2">
                    {isDeleting ? (
                      <div className="flex items-center gap-2 bg-red-50 p-2 rounded-lg border border-red-200">
                        <span className="text-sm text-red-800 font-medium whitespace-nowrap">Excluir utilizador?</span>
                        <button onClick={() => handleConfirmDeleteUser(username)} className="px-3 py-1 bg-red-600 text-white rounded text-sm font-bold hover:bg-red-700">Sim</button>
                        <button onClick={() => setUserToDelete(null)} className="px-3 py-1 bg-white border border-gray-300 text-gray-700 rounded text-sm font-bold hover:bg-gray-100">Não</button>
                      </div>
                    ) : isResetting ? (
                      <div className="flex items-center gap-2 bg-indigo-50 p-2 rounded-lg border border-indigo-200">
                        <input 
                          type="text" 
                          placeholder="Nova senha..." 
                          value={newResetPassword}
                          onChange={e => setNewResetPassword(e.target.value)}
                          className="px-2 py-1 text-sm border border-gray-300 rounded outline-none focus:border-indigo-500 w-32" 
                        />
                        <button onClick={() => handleConfirmResetPassword(username)} className="px-3 py-1 bg-indigo-600 text-white rounded text-sm font-bold hover:bg-indigo-700">Gravar</button>
                        <button onClick={() => { setUserToReset(null); setNewResetPassword(''); }} className="px-3 py-1 bg-white border border-gray-300 text-gray-700 rounded text-sm font-bold hover:bg-gray-100">Cancelar</button>
                      </div>
                    ) : (
                      <>
                        <button 
                          onClick={() => { setUserToReset(username); setUserToDelete(null); setAdminMessage({type:'', text:''}); }}
                          className="flex justify-center items-center gap-2 px-3 py-2 bg-white border border-indigo-200 text-indigo-600 rounded-lg text-sm font-semibold hover:bg-indigo-50 transition-colors"
                        >
                          <Key size={16} /> Resetar Senha
                        </button>
                        <button 
                          onClick={() => { setUserToDelete(username); setUserToReset(null); setAdminMessage({type:'', text:''}); }}
                          className="flex justify-center items-center gap-2 px-3 py-2 bg-white border border-red-200 text-red-600 rounded-lg text-sm font-semibold hover:bg-red-50 transition-colors"
                        >
                          <Trash2 size={16} /> Excluir
                        </button>
                      </>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );

  const handleLogin = (e) => {
    e.preventDefault();
    setLoginError('');
    setSuccessMessage('');

    if (authMode === 'admin') {
      if (loginPassword === '35516008') {
        setCurrentUser('Admin');
        setIsAuthenticated(true);
        setLoginError('');
        setCurrentView('list');
      } else {
        setLoginError('Senha de administrador incorreta.');
      }
      return;
    }

    const userRecord = registeredUsers[currentUser];
    
    if (!userRecord) {
      setLoginError('Utilizador não registado. Por favor, crie a sua conta primeiro.');
      return;
    }

    if (loginPassword === userRecord.password) {
      setIsAuthenticated(true);
      setLoginError('');
    } else {
      setLoginError('Senha incorreta!');
    }
  };

  const handleRegister = (e) => {
    e.preventDefault();
    setLoginError('');
    setSuccessMessage('');

    const username = regUsername.trim();

    if (!username) {
      setLoginError('Por favor, informe um Nome de Utilizador.');
      return;
    }

    if (username.toLowerCase() === 'admin') {
      setLoginError('Nome de utilizador reservado para uso do sistema.');
      return;
    }

    if (registeredUsers[username]) {
      setLoginError('Este utilizador já possui registo. Escolha outro ou faça o login.');
      return;
    }
    
    if (regPassword !== regConfirmPassword) {
      setLoginError('As senhas não coincidem!');
      return;
    }
    
    if (regPassword.length < 4) {
      setLoginError('A senha deve ter pelo menos 4 caracteres.');
      return;
    }

    if (!regFullName.trim()) {
      setLoginError('Por favor, informe o seu nome e apelido.');
      return;
    }

    const newUsers = {
      ...registeredUsers,
      [username]: {
        fullName: regFullName.trim(),
        password: regPassword
      }
    };
    
    setRegisteredUsers(newUsers);
    localStorage.setItem('brindes_os_users', JSON.stringify(newUsers));

    setCurrentUser(username);
    setAuthMode('login');
    setRegUsername('');
    setRegFullName('');
    setRegPassword('');
    setRegConfirmPassword('');
    setLoginPassword('');
    setSuccessMessage('Registo realizado com sucesso! Agora pode fazer login.');
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-100 flex flex-col items-center justify-center p-4 font-sans">
        <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
          <div className="bg-indigo-600 p-8 text-center relative">
            
            {/* O SEGREDO DO ADMIN: Clicar na logo da caixa abre a tela do admin */}
            <div 
              className="bg-white/20 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 cursor-pointer hover:bg-white/30 transition-colors"
              onClick={() => {
                setAuthMode('admin');
                setLoginError('');
                setSuccessMessage('');
                setLoginPassword('');
              }}
              title="BrindesOS"
            >
              <Package className="text-white" size={32} />
            </div>
            
            <h1 className="text-2xl font-bold text-white tracking-tight">Brindes<span className="text-indigo-200">OS</span></h1>
            <p className="text-indigo-100 mt-2 text-sm">
              {authMode === 'login' ? 'Faça login para gerir a produção' : 
               authMode === 'admin' ? 'Acesso Restrito ao Sistema' : 'Crie a sua senha de acesso'}
            </p>
          </div>
          
          <div className="p-8">
            {loginError && (
              <div className="mb-6 bg-red-50 text-red-600 p-3 rounded-lg text-sm font-medium flex items-center gap-2 border border-red-100">
                <AlertCircle size={16} className="shrink-0" />
                {loginError}
              </div>
            )}
            {successMessage && (
              <div className="mb-6 bg-green-50 text-green-700 p-3 rounded-lg text-sm font-medium flex items-center gap-2 border border-green-200">
                <CheckCircle size={16} className="shrink-0" />
                {successMessage}
              </div>
            )}
            
            {authMode === 'admin' ? (
              <form onSubmit={handleLogin} className="space-y-5">
                <div className="text-center bg-gray-50 border border-gray-200 rounded-lg p-4 mb-4">
                  <Shield size={32} className="mx-auto text-indigo-600 mb-2" />
                  <p className="font-bold text-gray-800 text-lg">Administrador</p>
                  <p className="text-xs text-gray-500">Acesso exclusivo para gestão</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Senha de Admin</label>
                  <div className="relative">
                    <input 
                      type="password"
                      value={loginPassword}
                      onChange={(e) => setLoginPassword(e.target.value)}
                      placeholder="Digite a senha restrita"
                      className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                      required
                    />
                    <Lock size={18} className="absolute left-3 top-3.5 text-gray-400" />
                  </div>
                </div>
                
                <button 
                  type="submit"
                  className="w-full bg-indigo-900 text-white font-bold py-3 rounded-lg hover:bg-indigo-800 transition-colors flex items-center justify-center gap-2 mt-4"
                >
                  <Shield size={20} />
                  Entrar como Admin
                </button>

                <div className="text-center mt-4">
                  <button 
                    type="button" 
                    onClick={() => {
                      setAuthMode('login');
                      setLoginError('');
                      setLoginPassword('');
                    }}
                    className="text-sm text-gray-500 hover:text-indigo-600 font-semibold transition-colors"
                  >
                    Voltar para o acesso de utilizadores
                  </button>
                </div>
              </form>
            ) : authMode === 'login' ? (
              <form onSubmit={handleLogin} className="space-y-5">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Selecione o Utilizador</label>
                  {usersList.length > 0 ? (
                    <select 
                      value={currentUser}
                      onChange={(e) => {
                        setCurrentUser(e.target.value);
                        setLoginError('');
                        setSuccessMessage('');
                      }}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none bg-white font-medium text-gray-800"
                    >
                      {usersList.map(user => (
                        <option key={user} value={user}>{user}</option>
                      ))}
                    </select>
                  ) : (
                    <div className="w-full px-4 py-3 border border-gray-300 rounded-lg bg-gray-50 text-gray-500 text-sm italic text-center">
                      Nenhuma conta criada ainda.
                    </div>
                  )}
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Senha</label>
                  <div className="relative">
                    <input 
                      type="password"
                      value={loginPassword}
                      onChange={(e) => setLoginPassword(e.target.value)}
                      placeholder="Digite a sua senha"
                      className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                      disabled={usersList.length === 0}
                      required
                    />
                    <Lock size={18} className="absolute left-3 top-3.5 text-gray-400" />
                  </div>
                </div>
                
                <button 
                  type="submit"
                  disabled={usersList.length === 0}
                  className={`w-full text-white font-bold py-3 rounded-lg transition-colors flex items-center justify-center gap-2 mt-4 ${usersList.length === 0 ? 'bg-indigo-300 cursor-not-allowed' : 'bg-indigo-600 hover:bg-indigo-700'}`}
                >
                  <LogIn size={20} />
                  Acessar Sistema
                </button>

                <div className="text-center mt-4">
                  <button 
                    type="button" 
                    onClick={() => {
                      setAuthMode('register');
                      setLoginError('');
                      setSuccessMessage('');
                    }}
                    className="text-sm text-indigo-600 hover:text-indigo-800 font-semibold transition-colors"
                  >
                    Nova Conta? Faça o seu registo
                  </button>
                </div>
              </form>
            ) : (
              <form onSubmit={handleRegister} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Nome de Utilizador (Login)</label>
                  <input 
                    type="text"
                    value={regUsername}
                    onChange={(e) => setRegUsername(e.target.value)}
                    placeholder="Ex: joao.silva"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Nome e Apelido</label>
                  <input 
                    type="text"
                    value={regFullName}
                    onChange={(e) => setRegFullName(e.target.value)}
                    placeholder="Ex: Rodrigo Silva"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Crie uma Senha</label>
                  <div className="relative">
                    <input 
                      type="password"
                      value={regPassword}
                      onChange={(e) => setRegPassword(e.target.value)}
                      placeholder="Mínimo de 4 caracteres"
                      className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                      required
                    />
                    <Lock size={18} className="absolute left-3 top-3.5 text-gray-400" />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Confirme a Senha</label>
                  <div className="relative">
                    <input 
                      type="password"
                      value={regConfirmPassword}
                      onChange={(e) => setRegConfirmPassword(e.target.value)}
                      placeholder="Repita a senha"
                      className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                      required
                    />
                    <Lock size={18} className="absolute left-3 top-3.5 text-gray-400" />
                  </div>
                </div>
                
                <button 
                  type="submit"
                  className="w-full bg-green-600 text-white font-bold py-3 rounded-lg hover:bg-green-700 transition-colors flex items-center justify-center gap-2 mt-2"
                >
                  <CheckCircle size={20} />
                  Finalizar Registo
                </button>

                <div className="text-center mt-4">
                  <button 
                    type="button" 
                    onClick={() => {
                      setAuthMode('login');
                      setLoginError('');
                    }}
                    className="text-sm text-gray-600 hover:text-indigo-600 font-semibold transition-colors"
                  >
                    Já tem registo? Faça login
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 font-sans">
      <nav className="bg-white border-b border-gray-200 shadow-sm sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <div className="flex items-center gap-3">
              <div className="bg-indigo-600 p-2 rounded-lg">
                <Package className="text-white" size={24} />
              </div>
              <span className="text-xl font-bold text-gray-900 tracking-tight">Brindes<span className="text-indigo-600">OS</span></span>
            </div>
            
            <div className="flex items-center gap-4">
              <div className="relative hidden md:block">
                <input 
                  type="text" 
                  placeholder="Procurar OS ou Cliente..." 
                  className="pl-10 pr-4 py-2 border border-gray-300 rounded-full bg-gray-50 focus:bg-white focus:ring-2 focus:ring-indigo-500 outline-none text-sm w-64 transition-all"
                />
                <Search size={18} className="absolute left-3 top-2.5 text-gray-400" />
              </div>
              
              <button 
                onClick={() => setCurrentView('products')}
                className="flex items-center gap-2 text-sm font-medium text-gray-600 hover:text-indigo-600 transition-colors px-2 py-2 rounded-lg hover:bg-indigo-50"
                title="Gerir Produtos"
              >
                <Tags size={20} />
                <span className="hidden sm:inline">Produtos</span>
              </button>

              {currentUser === 'Admin' && (
                <button 
                  onClick={() => setCurrentView('usersAdmin')}
                  className="flex items-center gap-2 text-sm font-medium text-indigo-700 bg-indigo-50 transition-colors px-3 py-2 rounded-lg hover:bg-indigo-100"
                  title="Gerir Utilizadores"
                >
                  <Users size={20} />
                  <span className="hidden sm:inline font-bold">Utilizadores</span>
                </button>
              )}

              <div className="flex items-center gap-2 border-l border-gray-200 pl-4 ml-2">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold border ${currentUser === 'Admin' ? 'bg-indigo-900 text-white border-indigo-900' : 'bg-indigo-100 text-indigo-700 border-indigo-200'}`}>
                  {currentUser.substring(0, 1).toUpperCase()}
                </div>
                <div className="flex flex-col items-start">
                  <span className="text-sm font-bold text-gray-700 leading-tight">{currentUser}</span>
                  <button 
                    onClick={() => {
                      setIsAuthenticated(false);
                      setLoginPassword('');
                      setCurrentView('list');
                    }}
                    className="text-xs text-red-500 hover:text-red-700 font-medium flex items-center gap-1 mt-0.5"
                  >
                    <LogOut size={12} /> Sair
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {currentView === 'list' && renderList()}
        {(currentView === 'create' || currentView === 'edit') && renderForm()}
        {currentView === 'view' && renderOrderDetails()}
        {currentView === 'products' && renderProductsAdmin()}
        {currentView === 'usersAdmin' && currentUser === 'Admin' && renderUsersAdmin()}
      </main>
    </div>
  );
}