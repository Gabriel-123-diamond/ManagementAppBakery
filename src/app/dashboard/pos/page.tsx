
"use client";

import React, { useState, useMemo, useEffect, useRef, Suspense, useCallback } from "react";
import Image from "next/image";
import { Plus, Minus, X, Search, Trash2, Hand, CreditCard, Printer, User, Building, Loader2, Wallet, ArrowRightLeft, Edit, FileSignature, Check, PlusCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardFooter
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { useLocalStorage } from "@/hooks/use-local-storage";
import { collection, getDocs, doc, runTransaction, increment, getDoc, query, where, onSnapshot, addDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { handlePosSale, initializePaystackTransaction } from "@/app/actions";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { User, CartItem, Product, CompletedOrder, SelectableStaff, PartialPayment, PaymentMethod } from "./types";
import { ProductEditDialog } from "@/app/dashboard/components/product-edit-dialog";


const Receipt = React.forwardRef<HTMLDivElement, { order: CompletedOrder, storeAddress?: string }>(({ order, storeAddress }, ref) => {
    return (
        <div ref={ref} className="p-2">
            <div className="text-center mb-4">
                <h2 className="font-headline text-xl text-center">BMS</h2>
                <p className="text-center text-sm">Sale Receipt</p>
                {storeAddress && <p className="text-center text-xs text-muted-foreground">{storeAddress}</p>}
            </div>
            <div className="py-2 space-y-2 text-xs">
                <div className="space-y-1">
                    <p><strong>Order ID:</strong> {order.id.substring(0, 12)}...</p>
                    <p><strong>Date:</strong> {new Date(order.date).toLocaleString()}</p>
                    <p><strong>Payment Method:</strong> {order.paymentMethod}</p>
                    <p><strong>Customer:</strong> {order.customerName || 'Walk-in'}</p>
                </div>
                <Separator className="my-2" />
                {order.paymentMethod === 'Split' && order.partialPayments && (
                    <>
                    <div className="text-xs">
                        <h4 className="font-semibold mb-1">Payment Details:</h4>
                        {order.partialPayments.map((p, i) => (
                            <div key={i} className="flex justify-between">
                                <span>{p.method}:</span>
                                <span>{`₦${p.amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}</span>
                            </div>
                        ))}
                    </div>
                    <Separator className="my-2"/>
                    </>
                )}
                <Table>
                    <TableHeader>
                        <TableRow>
                        <TableHead className="h-auto p-1 text-xs">Item</TableHead>
                        <TableHead className="text-center h-auto p-1 text-xs">Qty</TableHead>
                        <TableHead className="text-right h-auto p-1 text-xs">Amount</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {order.items.map((item, index) => (
                        <TableRow key={item.id || index}>
                            <TableCell className="p-1 text-xs">{item.name}</TableCell>
                            <TableCell className="text-center p-1 text-xs">{item.quantity}</TableCell>
                            <TableCell className="text-right p-1 text-xs">₦{(item.price * item.quantity).toFixed(2)}</TableCell>
                        </TableRow>
                        ))}
                    </TableBody>
                </Table>
                <Separator className="my-2"/>
                 
                <div className="w-full space-y-1 pr-1">
                    <div className="flex justify-between font-bold text-base mt-1">
                        <span>Total</span>
                        <span>₦{order.total.toFixed(2)}</span>
                    </div>
                </div>
                <Separator className="my-2"/>
                <p className="text-center text-xs text-muted-foreground">Thank you for your patronage!</p>
            </div>
        </div>
    )
});
Receipt.displayName = 'Receipt';


const handlePrint = (node: HTMLElement | null) => {
    if (!node) return;
    const content = node.innerHTML;
    const printWindow = window.open('', '_blank');
    
    if (printWindow) {
        printWindow.document.write(`
            <html>
                <head>
                    <title>Receipt</title>
                    <style>
                        @media print {
                            @page { margin: 0; size: 80mm auto; }
                            body { font-family: sans-serif; margin: 0; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
                        }
                    </style>
                </head>
                <body>
                    ${content}
                </body>
            </html>
        `);
        printWindow.document.close();
        
        const tryPrint = () => {
             try {
                printWindow.focus();
                printWindow.print();
                setTimeout(() => {
                    if (!printWindow.closed) {
                       printWindow.close();
                    }
                }, 500);
            } catch (e) {
                console.error("Print failed:", e);
                setTimeout(tryPrint, 500);
            }
        };

        if (document.readyState === 'complete') {
            tryPrint();
        } else {
            printWindow.onload = tryPrint;
        }
    } else {
        alert('Please allow popups for this website');
    }
};

function CreateCustomerDialog({ onCustomerCreated, children }: { onCustomerCreated: (customer: User) => void, children: React.ReactNode }) {
    const { toast } = useToast();
    const [isOpen, setIsOpen] = useState(false);
    const [name, setName] = useState('');
    const [phone, setPhone] = useState('');
    const [email, setEmail] = useState('');
    const [address, setAddress] = useState('');
    
    const handleSave = async () => {
        if (!name || !phone) {
            toast({ variant: 'destructive', title: 'Error', description: 'Customer name and phone number are required.'});
            return;
        }
        
        try {
            const newCustomerRef = await addDoc(collection(db, "customers"), {
                name,
                phone,
                email,
                address,
                joinedDate: new Date().toISOString(),
                totalSpent: 0,
                amountOwed: 0,
                amountPaid: 0,
            });
            const newCustomer = { id: newCustomerRef.id, name, phone, email, address };
            onCustomerCreated(newCustomer as User);
            toast({ title: 'Success', description: 'New customer created.' });
            setIsOpen(false);
        } catch(error) {
            toast({ variant: 'destructive', title: 'Error', description: 'Failed to create new customer.'});
        }
    }

    return (
       <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>{children}</DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Create New Customer</DialogTitle>
                    <DialogDescription>Add a new customer to your database. This will be saved permanently.</DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                    <div className="space-y-2">
                        <Label htmlFor="create-customer-name">Customer Name</Label>
                        <Input id="create-customer-name" value={name} onChange={e => setName(e.target.value)} required />
                    </div>
                     <div className="space-y-2">
                        <Label htmlFor="create-customer-phone">Phone Number</Label>
                        <Input id="create-customer-phone" value={phone} onChange={e => setPhone(e.target.value)} required />
                    </div>
                     <div className="space-y-2">
                        <Label htmlFor="create-customer-email">Email (Optional)</Label>
                        <Input id="create-customer-email" type="email" value={email} onChange={e => setEmail(e.target.value)} />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="create-customer-address">Address (Optional)</Label>
                        <Input id="create-customer-address" value={address} onChange={e => setAddress(e.target.value)} />
                    </div>
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={() => setIsOpen(false)}>Cancel</Button>
                    <Button onClick={handleSave}>Create Customer</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}

function SplitPaymentDialog({
  isOpen,
  onOpenChange,
  total,
  onFinalize,
  onHold,
  user
}: {
  isOpen: boolean
  onOpenChange: (open: boolean) => void
  total: number
  onFinalize: (payments: PartialPayment[]) => void
  onHold: (partialPayments: PartialPayment[]) => void
  user: User | null;
}) {
  const [payments, setPayments] = useState<PartialPayment[]>([]);
  const [isSubmitting, setIsSubmitting] = useState<number | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    if (isOpen) {
      setPayments([{ id: Date.now(), method: '', amount: total, confirmed: false }]);
    }
  }, [isOpen, total]);
  
  const totalPaid = useMemo(() => {
    return payments.reduce(
        (acc, p) => acc + (p.confirmed ? Number(p.amount) : 0),
        0
      )
  }, [payments]);

  const remainingTotal = useMemo(() => total - totalPaid, [total, totalPaid]);

  const allConfirmed = useMemo(() => {
      const unconfirmedTotal = payments.filter(p => !p.confirmed).reduce((sum, p) => sum + Number(p.amount), 0);
      return Math.abs(unconfirmedTotal - remainingTotal) < 0.01 && payments.every(p => p.confirmed || p.amount === 0);
  }, [payments, remainingTotal]);


  const handleMethodChange = (id: number, method: PaymentMethod | '') => {
    setPayments(
      payments.map((p) => (p.id === id ? { ...p, method } : p))
    )
  }

  const handleAmountChange = (id: number, amountStr: string) => {
    const newAmount = parseFloat(amountStr) || 0;
    
    const availableToAllocate = total - totalPaid;
    
    const currentTotalOfOtherUnconfirmed = payments
        .filter(p => !p.confirmed && p.id !== id)
        .reduce((sum, p) => sum + Number(p.amount), 0);
    
    if (newAmount > availableToAllocate) {
        toast({ variant: 'destructive', title: 'Invalid Amount', description: `Amount cannot exceed remaining balance of ₦${availableToAllocate.toFixed(2)}.` });
        return;
    }

    setPayments(prevPayments => {
        let tempPayments = prevPayments.map(p => p.id === id ? { ...p, amount: newAmount } : p);
        const remainingToDistribute = availableToAllocate - newAmount;
        const otherUnconfirmed = tempPayments.filter(p => !p.confirmed && p.id !== id);

        if (otherUnconfirmed.length > 0) {
            const amountPerField = remainingToDistribute / otherUnconfirmed.length;
            return tempPayments.map(p => {
                if (otherUnconfirmed.some(u => u.id === p.id)) {
                    return { ...p, amount: amountPerField };
                }
                return p;
            });
        }
        return tempPayments;
    });
};

  const addPaymentMethod = () => {
    if (remainingTotal <= 0.01) {
        toast({variant: 'destructive', title: "Balance Cleared", description: "The total amount has already been paid."});
        return;
    }
    
    const unconfirmedPayments = payments.filter(p => !p.confirmed);
    const newAmount = remainingTotal / (unconfirmedPayments.length + 1);

    const updatedPayments = payments.map(p => !p.confirmed ? {...p, amount: newAmount} : p);
    
    setPayments([
      ...updatedPayments,
      { id: Date.now(), method: '', amount: newAmount, confirmed: false },
    ])
  }

  const removePaymentMethod = (id: number) => {
    const paymentToRemove = payments.find(p => p.id === id);
    if (!paymentToRemove || paymentToRemove.confirmed) return;
    
    const remainingPayments = payments.filter((p) => p.id !== id);
    const amountToRedistribute = paymentToRemove.amount;
    
    const unconfirmedPayments = remainingPayments.filter(p => !p.confirmed);
    if (unconfirmedPayments.length > 0) {
        const amountPerField = amountToRedistribute / unconfirmedPayments.length;
        setPayments(remainingPayments.map(p => !p.confirmed ? { ...p, amount: p.amount + amountPerField } : p));
    } else {
        setPayments(remainingPayments);
    }
  }
  
  const handleConfirmPayment = (id: number) => {
    const payment = payments.find(p => p.id === id);
    if (!payment || !user) return;
    
    if (payment.method === 'Paystack') {
        handlePaystackPartialPayment(payment);
    } else {
        // For Cash and POS, just confirm locally
        confirmPayment(id);
    }
  };

  const handlePaystackPartialPayment = async (payment: PartialPayment) => {
    if (!user) return;
    
    setIsSubmitting(payment.id);
    const initResult = await initializePaystackTransaction({
        email: user.email,
        total: payment.amount,
        customerName: 'POS Split Payment',
        staffId: user.staff_id,
        items: [],
        isPosSale: true,
        isPartialPayment: true,
    });
    
    if (initResult.success && initResult.reference) {
        const PaystackPop = (await import('@paystack/inline-js')).default;
        const paystack = new PaystackPop();
        paystack.newTransaction({
            key: process.env.NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY || '',
            email: user.email,
            amount: Math.round(payment.amount * 100),
            ref: initResult.reference,
            onSuccess: () => {
                confirmPayment(payment.id, true);
                setIsSubmitting(null);
            },
            onClose: () => {
                toast({ variant: "destructive", title: "Payment Cancelled" });
                setIsSubmitting(null);
            }
        });
    } else {
        toast({ variant: 'destructive', title: 'Error', description: initResult.error || 'Could not initialize payment.' });
        setIsSubmitting(null);
    }
  };

  const confirmPayment = (id: number, isVerified = false) => {
    const payment = payments.find(p => p.id === id);
    if (!payment) return;

    const confirmAction = () => {
        setPayments(prevPayments => {
            const newPayments = prevPayments.map((p) => (p.id === id ? { ...p, confirmed: true } : p));
            const newTotalPaid = newPayments.filter(p => p.confirmed).reduce((sum, p) => sum + p.amount, 0);
            const newRemaining = total - newTotalPaid;
            const unconfirmed = newPayments.filter(p => !p.confirmed);
            
            if (unconfirmed.length > 0) {
                const amountPerField = newRemaining / unconfirmed.length;
                return newPayments.map(p => !p.confirmed ? { ...p, amount: amountPerField } : p);
            }
            return newPayments;
        });

        toast({title: "Payment Confirmed", description: `Confirmed ₦${payment.amount.toFixed(2)} via ${payment.method}.`})
    }
    
    if (payment.method !== 'Paystack' && !isVerified) {
        confirmAction();
        return;
    }
    
    if (isVerified) {
        // This is for paystack callback
        confirmAction();
        toast({title: "Paystack Payment Confirmed", description: `Received ₦${payment.amount.toFixed(2)}.`})
    }
  }


  const availableMethods: PaymentMethod[] = ['Cash', 'POS', 'Paystack'];
  
  const handleDialogInteractOutside = (event: Event) => {
    // Check if the event target is inside the Paystack iframe
    const target = event.target as HTMLElement;
    if (target.closest('iframe[src*="paystack.com"]')) {
      return; // Do not prevent default if it's the Paystack modal
    }
    event.preventDefault();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md" onInteractOutside={handleDialogInteractOutside}>
        <DialogHeader>
          <DialogTitle>Split Payment</DialogTitle>
          <DialogDescription>
            Total Amount:{" "}
            <span className="font-bold text-foreground">
              ₦{total.toFixed(2)}
            </span>
            <br />
            Remaining:{" "}
            <span className="font-bold text-destructive">
              ₦{remainingTotal.toFixed(2)}
            </span>
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4 max-h-80 overflow-y-auto">
          {payments.map((payment, index) => {
            const usedMethods = payments.filter(p => p.id !== payment.id).map(p => p.method);
            return (
              <div
                key={payment.id}
                className="grid grid-cols-[1fr_120px_auto_auto] items-center gap-2"
              >
                <Select
                  value={payment.method}
                  onValueChange={(value: PaymentMethod | '') =>
                    handleMethodChange(payment.id, value)
                  }
                  disabled={payment.confirmed}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select Method..." />
                  </SelectTrigger>
                  <SelectContent>
                    {availableMethods.map((method) => (
                      <SelectItem
                        key={method}
                        value={method}
                        disabled={usedMethods.includes(method)}
                      >
                        {method}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Input
                  type="number"
                  placeholder="Amount"
                  value={payment.amount > 0 ? payment.amount.toFixed(2) : ''}
                  onChange={(e) => handleAmountChange(payment.id, e.target.value)}
                  disabled={payment.confirmed}
                />
                 
                {payment.method === 'Paystack' ? (
                     <Button
                        size="icon"
                        variant={payment.confirmed ? "ghost" : "outline"}
                        onClick={() => handleConfirmPayment(payment.id)}
                        disabled={payment.confirmed || !payment.method || !payment.amount || isSubmitting === payment.id}
                    >
                         {isSubmitting === payment.id ? <Loader2 className="h-4 w-4 animate-spin"/> : (payment.confirmed ? <Check className="h-4 w-4 text-green-500" /> : <Check className="h-4 w-4" />)}
                    </Button>
                ) : (
                    <AlertDialog>
                        <AlertDialogTrigger asChild>
                            <Button
                                size="icon"
                                variant={payment.confirmed ? "ghost" : "outline"}
                                disabled={payment.confirmed || !payment.method || !payment.amount || isSubmitting === payment.id}
                            >
                                {isSubmitting === payment.id ? <Loader2 className="h-4 w-4 animate-spin"/> : (payment.confirmed ? <Check className="h-4 w-4 text-green-500" /> : <Check className="h-4 w-4" />)}
                            </Button>
                        </AlertDialogTrigger>
                         {!payment.confirmed && (
                            <AlertDialogContent>
                                <AlertDialogHeader>
                                    <AlertDialogTitle>Confirm Payment?</AlertDialogTitle>
                                    <AlertDialogDescription>Confirm receipt of <strong>{`₦${Number(payment.amount).toFixed(2)}`}</strong> via <strong>{payment.method}</strong>.</AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                    <AlertDialogAction onClick={() => confirmPayment(payment.id)}>Confirm</AlertDialogAction>
                                </AlertDialogFooter>
                            </AlertDialogContent>
                        )}
                    </AlertDialog>
                )}
               

                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => removePaymentMethod(payment.id)}
                  disabled={payment.confirmed}
                >
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            )})}
          <div className="flex justify-start">
             <Button
                variant="outline"
                onClick={addPaymentMethod}
                disabled={allConfirmed}
            >
                <PlusCircle className="mr-2 h-4 w-4" />
                Add Payment Method
            </Button>
          </div>
        </div>
        <DialogFooter className="grid grid-cols-2 gap-2">
            <Button variant="secondary" onClick={() => { onHold(payments); onOpenChange(false); }} disabled={allConfirmed}>
                <Hand className="mr-2 h-4 w-4" /> Hold Order
            </Button>
             <Button
                onClick={() => onFinalize(payments)}
                disabled={!allConfirmed}
            >
                {isSubmitting === 0 && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                <Check className="mr-2 h-4 w-4" />
                Finalize Sale
            </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function POSPageContent() {
  const { toast } = useToast();
  const [user, setUser] = useState<User | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoadingProducts, setIsLoadingProducts] = useState(true);
  const [cart, setCart] = useLocalStorage<CartItem[]>('posCart', []);
  const [heldOrders, setHeldOrders] = useLocalStorage<(CartItem[] & { partialPayments?: PartialPayment[] })[][]>('heldOrders', []);
  const [activeTab, setActiveTab] = useState('All');
  const [customerType, setCustomerType] = useState<'walk-in' | 'registered'>('walk-in');
  const [customerName, setCustomerName] = useLocalStorage('posCustomerName', '');
  const [customerEmail, setCustomerEmail] = useLocalStorage('posCustomerEmail', '');
  const [isReceiptOpen, setIsReceiptOpen] = useState(false);
  const [lastCompletedOrder, setLastCompletedOrder] = useState<CompletedOrder | null>(null);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [storeAddress, setStoreAddress] = useState<string | undefined>();
  const [searchTerm, setSearchTerm] = useState("");
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [isSplitPaymentOpen, setIsSplitPaymentOpen] = useState(false);
  
  const [paymentStatus, setPaymentStatus] = useState<'idle' | 'processing' | 'success' | 'failed' | 'cancelled'>('idle');

  const [allStaff, setAllStaff] = useState<SelectableStaff[]>([]);
  const [selectedStaffId, setSelectedStaffId] = useLocalStorage<string | null>('posSelectedStaff', null);
  const [isStaffSelectionOpen, setIsStaffSelectionOpen] = useState(false);
  
  const receiptRef = useRef<HTMLDivElement>(null);

  const [hasMounted, setHasMounted] = useState(false);
    useEffect(() => {
        setHasMounted(true);
    }, []);

  const total = useMemo(() => cart.reduce((acc, item) => acc + item.price * item.quantity, 0), [cart]);

  const fetchProductsForStaff = useCallback(async (staffId: string) => {
    setIsLoadingProducts(true);
    
    const unsub = onSnapshot(collection(db, 'staff', staffId, 'personal_stock'), async (stockSnapshot) => {
        if (stockSnapshot.empty) {
            setProducts([]);
            setIsLoadingProducts(false);
            return;
        }

        const productDetailsPromises = stockSnapshot.docs.map(stockDoc => {
            const productId = stockDoc.data().productId;
            return getDoc(doc(db, 'products', productId));
        });
        const productDetailsSnapshots = await Promise.all(productDetailsPromises);
        
        const productsList = stockSnapshot.docs.map((stockDoc, index) => {
            const stockData = stockDoc.data();
            const productDetailsDoc = productDetailsSnapshots[index];
            
            if (productDetailsDoc.exists()) {
                const productDetails = productDetailsDoc.data();
                return {
                    id: productDetailsDoc.id,
                    name: productDetails.name,
                    price: productDetails.price,
                    stock: stockData.stock,
                    category: productDetails.category,
                    image: productDetails.image,
                    'data-ai-hint': productDetails['data-ai-hint'],
                    costPrice: productDetails.costPrice || 0,
                    minPrice: productDetails.minPrice,
                    maxPrice: productDetails.maxPrice,
                    lowStockThreshold: productDetails.lowStockThreshold
                } as Product;
            }
            return null;
        }).filter((p): p is Product => p !== null && p.stock > 0);

        setProducts(productsList);
        setIsLoadingProducts(false);
    });
    return unsub;
  }, []);

  const clearCartAndStorage = useCallback(() => {
    setCart([]);
    setCustomerName('');
    setCustomerEmail('');
  }, [setCart, setCustomerName, setCustomerEmail]);
  
  const handleSaleMade = useCallback((order: CompletedOrder) => {
      setLastCompletedOrder(order);
      setIsReceiptOpen(true);
      clearCartAndStorage();
      setPaymentStatus('idle');
      setIsCheckoutOpen(false);
      setIsSplitPaymentOpen(false);
  }, [clearCartAndStorage]);

  useEffect(() => {
    const initializePos = async () => {
      const storedUser = localStorage.getItem('loggedInUser');
      if (storedUser) {
        const parsedUser: User = JSON.parse(storedUser);
        setUser(parsedUser);

        const adminRoles = ['Manager', 'Developer'];
        if (adminRoles.includes(parsedUser.role)) {
          const staffQuery = query(collection(db, "staff"), where("role", "==", "Showroom Staff"));
          const staffSnapshot = await getDocs(staffQuery);
          setAllStaff(staffSnapshot.docs.map(d => ({ staff_id: d.id, ...d.data() } as SelectableStaff)));
          if (!selectedStaffId) {
            setIsStaffSelectionOpen(true);
          }
        } else {
          setSelectedStaffId(parsedUser.staff_id);
        }
      }
      const settingsDoc = await getDoc(doc(db, 'settings', 'app_config'));
      if (settingsDoc.exists()) {
          setStoreAddress(settingsDoc.data().storeAddress);
      }
    };
    initializePos();
  }, [selectedStaffId]);

  useEffect(() => {
    let unsubscribe: (() => void) | null = null;
    if (selectedStaffId) {
        fetchProductsForStaff(selectedStaffId).then(unsub => {
            if (unsub) unsubscribe = unsub;
        });
    } else {
        setProducts([]);
        setIsLoadingProducts(false);
    }
    return () => {
        if (unsubscribe) {
            unsubscribe();
        }
    };
  }, [selectedStaffId, fetchProductsForStaff])

  const handleFinalizeSplitOrder = async (payments: PartialPayment[]) => {
    setPaymentStatus('processing');
    if (!user || !selectedStaffId) {
        toast({ variant: 'destructive', title: 'Error', description: "User or operating staff not identified." });
        setPaymentStatus('failed');
        return;
    }

    const itemsWithCost = cart.map(item => {
        const productDetails = products.find(p => p.id === item.id);
        return { productId: item.id, name: item.name, quantity: item.quantity, price: item.price, costPrice: productDetails?.costPrice || 0 };
    });

    const staffDoc = await getDoc(doc(db, "staff", selectedStaffId));
    const staffName = staffDoc.exists() ? staffDoc.data().name : 'Unknown';

    const saleData = {
        items: itemsWithCost,
        total: total,
        paymentMethod: 'Split' as 'Split',
        partialPayments: payments.filter(p => p.confirmed).map(({id, confirmed, ...rest}) => rest),
        customerName: customerName || 'Walk-in',
        staffId: selectedStaffId,
        staffName: staffName,
        date: new Date().toISOString()
    };
    
    const result = await handlePosSale(saleData);

    if (result.success && result.orderId) {
        const completedOrder: CompletedOrder = {
            id: result.orderId,
            items: cart,
            total: total,
            date: new Date().toISOString(),
            paymentMethod: 'Split',
            partialPayments: payments.filter(p => p.confirmed).map(({id, confirmed, ...rest}) => rest),
            customerName: customerName || 'Walk-in',
            status: 'Completed',
            subtotal: total, tax: 0
        };
        handleSaleMade(completedOrder);
        toast({ title: 'Sale Recorded', description: 'Split payment order has been successfully recorded.' });
    } else {
        toast({ variant: "destructive", title: "Order Failed", description: result.error || "Could not complete the sale." });
        setPaymentStatus('failed');
    }
}
  
  const handleSinglePayment = async (method: 'Cash' | 'POS' | 'Paystack') => {
    setIsCheckoutOpen(false);
    if (method === 'Paystack') {
        handlePaystackPayment();
        return;
    }
    
    setPaymentStatus('processing');

    if (!user || !selectedStaffId) {
        toast({ variant: "destructive", title: "Error", description: "User or operating staff not identified." });
        setPaymentStatus('idle');
        return;
    }
    
    const itemsWithCost = cart.map(item => {
        const productDetails = products.find(p => p.id === item.id);
        return { productId: item.id, name: item.name, quantity: item.quantity, price: item.price, costPrice: productDetails?.costPrice || 0 };
    });

    const staffDoc = await getDoc(doc(db, "staff", selectedStaffId));
    const staffName = staffDoc.exists() ? staffDoc.data().name : 'Unknown';

    const saleData = {
        items: itemsWithCost,
        total,
        paymentMethod: method,
        customerName: customerName || 'Walk-in',
        staffId: selectedStaffId,
        staffName: staffName,
        date: new Date().toISOString()
    };
    
    const result = await handlePosSale(saleData);

    if (result.success && result.orderId) {
        const completedOrder: CompletedOrder = {
            id: result.orderId,
            items: cart,
            total,
            date: new Date().toISOString(),
            paymentMethod: method,
            customerName: customerName || 'Walk-in',
            status: 'Completed',
            subtotal: total, tax: 0
        };
        handleSaleMade(completedOrder);
        toast({ title: 'Sale Recorded', description: 'Order has been successfully recorded.' });
    } else {
        toast({ variant: "destructive", title: "Order Failed", description: result.error || "Could not complete the sale." });
        setPaymentStatus('failed');
    }
  }

  const handlePaystackPayment = async () => {
    if (!user || !selectedStaffId) return;

    setPaymentStatus('processing');
    const itemsWithCost = cart.map(item => {
        const productDetails = products.find(p => p.id === item.id);
        return { productId: item.id, name: item.name, quantity: item.quantity, price: item.price, costPrice: productDetails?.costPrice || 0 };
    });

    const staffDoc = await getDoc(doc(db, "staff", selectedStaffId));
    const staffName = staffDoc.exists() ? staffDoc.data().name : 'Unknown';

    const initResult = await initializePaystackTransaction({
        email: customerEmail || user.email,
        total: total,
        customerName: customerName || 'Walk-in',
        staffId: selectedStaffId,
        staffName,
        items: itemsWithCost,
        isPosSale: true,
        isDebtPayment: false,
    });
    
    if (initResult.success && initResult.reference) {
        const PaystackPop = (await import('@paystack/inline-js')).default;
        const paystack = new PaystackPop();
        
        paystack.newTransaction({
            key: process.env.NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY || '',
            email: customerEmail || user.email,
            amount: Math.round(total * 100),
            ref: initResult.reference,
            onSuccess: async (transaction) => {
                setPaymentStatus('processing');
                const saleData = {
                    items: itemsWithCost,
                    total: total,
                    paymentMethod: 'Paystack' as 'Paystack',
                    customerName: customerName || 'Walk-in',
                    staffId: selectedStaffId,
                    staffName,
                    date: new Date().toISOString()
                };
                const result = await handlePosSale(saleData);

                if (result.success && result.orderId) {
                    const completedOrder: CompletedOrder = {
                        id: result.orderId,
                        items: cart,
                        total,
                        date: new Date().toISOString(),
                        paymentMethod: 'Paystack',
                        customerName: customerName || 'Walk-in',
                        status: 'Completed',
                        subtotal: total, tax: 0
                    };
                    handleSaleMade(completedOrder);
                    toast({ title: "Payment Successful", description: "Order has been verified and completed." });
                    setPaymentStatus('success');
                } else {
                    toast({ variant: "destructive", title: "Verification Failed", description: result.error || "Could not verify payment." });
                    setPaymentStatus('failed');
                }
            },
            onClose: () => {
                if (paymentStatus !== 'success') {
                    toast({ variant: "destructive", title: "Payment Cancelled" });
                    setPaymentStatus('cancelled');
                }
            }
        });
    } else {
        toast({ variant: 'destructive', title: 'Error', description: initResult.error || 'Could not initialize payment.' });
        setPaymentStatus('failed');
    }
  }

  const categories = ['All', ...new Set(products.map(p => p.category))];
  
  const filteredProducts = useMemo(() => {
    let productsToFilter = products;
    if (activeTab !== 'All') {
        productsToFilter = productsToFilter.filter(p => p.category === activeTab);
    }
    if (searchTerm) {
        productsToFilter = productsToFilter.filter(p => p.name.toLowerCase().includes(searchTerm.toLowerCase()));
    }
    return productsToFilter;
  }, [activeTab, products, searchTerm]);


  const addToCart = (product: Product) => {
    const productInStock = products.find(p => p.id === product.id);
    if (!productInStock || productInStock.stock === 0) {
      toast({ variant: "destructive", title: "Out of Stock", description: `${product.name} is currently unavailable.` });
      return;
    };
    
    setCart((prevCart) => {
      const existingItem = prevCart.find((item) => item.id === product.id);
      if (existingItem) {
        if(existingItem.quantity >= productInStock.stock) {
            toast({ variant: "destructive", title: "Stock Limit Reached", description: `Cannot add more ${product.name}.` });
            return prevCart;
        }
        return prevCart.map((item) => item.id === product.id ? { ...item, quantity: item.quantity + 1, price: productInStock.price } : item);
      }
      return [...prevCart, { id: product.id, name: product.name, price: product.price, quantity: 1, costPrice: product.costPrice }];
    });
  };

  const updateQuantity = (productId: string, newQuantity: number) => {
    setCart((prevCart) => {
      if (newQuantity <= 0) {
        return prevCart.filter((item) => item.id !== productId);
      }
      const productInStock = products.find(p => p.id === productId);
      if (productInStock && newQuantity > productInStock.stock) {
        toast({ variant: "destructive", title: "Stock Limit Reached", description: `Only ${productInStock.stock} units available.` });
        return prevCart.map((item) => item.id === productId ? { ...item, quantity: productInStock.stock } : item);
      }
      return prevCart.map((item) =>
        item.id === productId ? { ...item, quantity: newQuantity } : item
      );
    });
  };
  
  const clearCart = () => {
    if (cart.length === 0) return;
    clearCartAndStorage();
    toast({ title: "Cart Cleared", description: "All items have been removed." });
  };

  const holdOrder = (partialPayments: PartialPayment[] = []) => {
    if (cart.length === 0) return;
    const orderToHold = [...cart];
    (orderToHold as any).partialPayments = partialPayments;
    setHeldOrders(prev => [...prev, [orderToHold]]);
    clearCartAndStorage();
    toast({ title: "Order Held", description: "The current cart has been saved." });
  }

  const resumeOrder = (orderIndex: number) => {
    if (cart.length > 0) {
       toast({ variant: "destructive", title: "Cart is not empty", description: "Please clear or complete the current order before resuming." });
      return;
    }
    const orderToResume = heldOrders[orderIndex];
    setCart(orderToResume as any);
    setHeldOrders(prev => prev.filter((_, index) => index !== orderIndex));
    setActiveTab('All');
  }

  const handleSelectStaff = (staffId: string) => {
    setSelectedStaffId(staffId);
    setIsStaffSelectionOpen(false);
  }

  const selectedStaffName = allStaff.find(s => s.staff_id === selectedStaffId)?.name || user?.name;
  
  if (!hasMounted) {
    return <div className="flex justify-center items-center h-full"><Loader2 className="h-16 w-16 animate-spin" /></div>;
  }

  return (
     <>
     <div className="flex flex-col xl:flex-row gap-6 h-full print:hidden">
      {/* Products Section */}
      <div className="flex-grow xl:w-2/3">
        <Card className="flex flex-col h-full">
            <CardContent className="p-4 flex flex-col gap-4 flex-grow">
            <header className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold font-headline">Point of Sale</h1>
                    {selectedStaffId && (
                        <div 
                        className={cn("text-sm text-muted-foreground", (user?.role === 'Manager' || user?.role === 'Developer') && "hover:text-primary cursor-pointer")}
                        onClick={() => user?.role === 'Manager' || user?.role === 'Developer' ? setIsStaffSelectionOpen(true) : null}
                        >
                        Operating as: <span className="font-semibold">{selectedStaffName}</span>
                        </div>
                    )}
                </div>
                <div className="relative w-full sm:w-auto">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                        <Input placeholder="Search products..." className="pl-10 w-full sm:w-64" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
                    </div>
            </header>
            <Tabs value={activeTab} onValueChange={setActiveTab} className="flex flex-col flex-grow">
                <div className="overflow-x-auto pb-2">
                    <TabsList>
                        {categories.map(category => (
                            <TabsTrigger key={category} value={category} disabled={!selectedStaffId}>
                                {category}
                            </TabsTrigger>
                        ))}
                        <TabsTrigger value="held-orders" className="flex gap-2" disabled={!selectedStaffId}>
                            Held Orders <Badge>{heldOrders.length}</Badge>
                        </TabsTrigger>
                    </TabsList>
                </div>

                <TabsContent value={activeTab} className="mt-4 flex-grow">
                    <ScrollArea className="h-[calc(100vh_-_24rem)] xl:h-auto">
                        {isLoadingProducts ? (
                            <div className="flex items-center justify-center h-full">
                                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                            </div>
                        ) : (
                            filteredProducts.length > 0 ? (
                                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 pr-4">
                                {filteredProducts.map((product) => (
                                    <Card
                                    key={product.id}
                                    onClick={() => addToCart(product)}
                                    className={`cursor-pointer hover:shadow-lg transition-shadow group relative overflow-hidden ${product.stock === 0 ? 'opacity-60 cursor-not-allowed' : ''}`}
                                    >
                                        <CardContent className="p-0">
                                            <Image
                                            src={product.image}
                                            alt={product.name}
                                            width={150}
                                            height={150}
                                            className="rounded-t-lg object-cover w-full aspect-square transition-transform group-hover:scale-105"
                                            data-ai-hint={product['data-ai-hint']}
                                            unoptimized
                                            />
                                            {user?.role === 'Developer' && (
                                                <Button
                                                    variant="secondary"
                                                    size="icon"
                                                    className="absolute top-2 left-2 h-7 w-7 opacity-0 group-hover:opacity-100"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        setEditingProduct(product);
                                                    }}
                                                >
                                                    <Edit className="h-4 w-4" />
                                                </Button>
                                            )}
                                            <Badge variant="secondary" className="absolute top-2 right-2">
                                                Stock: {product.stock}
                                            </Badge>
                                            {product.stock === 0 && (
                                                <div className="absolute inset-0 bg-card/80 flex items-center justify-center rounded-lg">
                                                    <p className="font-bold text-lg text-destructive">Out of Stock</p>
                                                </div>
                                            )}
                                        </CardContent>
                                        <CardFooter className="p-3 flex flex-col items-start bg-muted/50">
                                            <h3 className="font-semibold text-sm">{product.name}</h3>
                                            <p className="text-sm text-primary font-bold">₦{product.price.toFixed(2)}</p>
                                        </CardFooter>
                                    </Card>
                                ))}
                                </div>
                            ) : (
                                <div className="flex items-center justify-center h-full text-muted-foreground">
                                    <p>{selectedStaffId ? "No products found for this filter." : "Select a staff member to begin."}</p>
                                </div>
                            )
                        )}
                    </ScrollArea>
                </TabsContent>
                <TabsContent value="held-orders" className="mt-4">
                    <ScrollArea className="h-[calc(100vh_-_22rem)] xl:h-auto">
                        {heldOrders.length === 0 ? (
                        <div className="flex items-center justify-center h-full text-muted-foreground">
                            <p>No orders on hold.</p>
                        </div>
                        ) : (
                        <div className="space-y-2 pr-4">
                            {heldOrders.map((heldCart, index) => (
                           <Card key={index} className="p-2 flex justify-between items-center">
                              <div>
                                <p className="font-semibold">Held Order #{index + 1}</p>
                                <p className="text-sm text-muted-foreground">{heldCart.length} items - Total: ₦{heldCart.reduce((acc: any, item: any) => acc + item.price * item.quantity, 0).toFixed(2)}</p>
                              </div>
                              <Button size="sm" onClick={() => resumeOrder(index)}>Resume</Button>
                           </Card>
                            ))}
                        </div>
                        )}
                    </ScrollArea>
                </TabsContent>
            </Tabs>
            </CardContent>
        </Card>
      </div>

      {/* Order Summary Section */}
       <div className="xl:w-1/3 xl:min-w-[450px]">
            <Card className="flex flex-col h-full">
                <CardContent className="p-4 flex flex-col gap-4 flex-grow">
                <h2 className="text-xl font-bold font-headline mb-2">Current Order</h2>
                    <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-2">
                            <Button variant={customerType === 'walk-in' ? 'default' : 'outline'} onClick={() => setCustomerType('walk-in')}>
                                <User className="mr-2 h-4 w-4" />
                                Walk-in
                            </Button>
                            <CreateCustomerDialog onCustomerCreated={(c) => {}}>
                                <Button variant={customerType === 'registered' ? 'default' : 'outline'}>
                                    <Building className="mr-2 h-4 w-4" />
                                    Registered
                                </Button>
                            </CreateCustomerDialog>
                        </div>
                        {customerType === 'walk-in' && (
                            <div className="space-y-1.5">
                                <Label htmlFor="customer-name">Customer Name (Optional)</Label>
                                <Input id="customer-name" placeholder="Enter name for walk-in" value={customerName} onChange={(e) => setCustomerName(e.target.value)} />
                            </div>
                        )}
                        {customerType === 'registered' && (
                            <div className="space-y-1.5">
                                <Label htmlFor="customer-search">Search Registered Customer</Label>
                                <Input id="customer-search" placeholder="Search by name or phone..." />
                            </div>
                        )}
                        <div className="space-y-1.5">
                            <Label htmlFor="customer-email">Customer Email (for receipt)</Label>
                            <Input id="customer-email" placeholder="customer@example.com" value={customerEmail} onChange={(e) => setCustomerEmail(e.target.value)} />
                        </div>
                    </div>
                    <Separator />
                
                <ScrollArea className="flex-grow -mr-4 pr-4 mb-4 min-h-[150px]">
                    {cart.length === 0 ? (
                    <div className="flex items-center justify-center h-full text-muted-foreground">
                        <p>Click on a product to add it to the order.</p>
                    </div>
                    ) : (
                    <div className="space-y-4">
                        {cart.map((item) => (
                        <div key={item.id} className="flex items-center gap-4 text-sm">
                            <div className="flex-grow">
                            <p className="font-semibold">{item.name}</p>
                            <p className="text-muted-foreground">₦{item.price.toFixed(2)}</p>
                            </div>
                            <div className="flex items-center gap-2 bg-muted/50 rounded-md p-1">
                            <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6"
                                onClick={() => updateQuantity(item.id, item.quantity - 1)}
                            >
                                <Minus className="h-4 w-4" />
                            </Button>
                            <span className="font-bold w-4 text-center">{item.quantity}</span>
                            <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6"
                                onClick={() => updateQuantity(item.id, item.quantity + 1)}
                            >
                                <Plus className="h-4 w-4" />
                            </Button>
                            </div>
                            <p className="font-semibold w-16 text-right">₦{(item.price * item.quantity).toFixed(2)}</p>
                            <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 text-destructive/70 hover:text-destructive"
                                onClick={() => updateQuantity(item.id, 0)}
                            >
                                <X className="h-4 w-4" />
                            </Button>
                        </div>
                        ))}
                    </div>
                    )}
                </ScrollArea>
                </CardContent>

                <CardFooter className="p-4 flex flex-col gap-4 border-t bg-muted/20">
                    <div className="w-full space-y-2 text-sm">
                        <div className="flex justify-between font-bold text-lg">
                            <span>Total</span>
                            <span>₦{total.toFixed(2)}</span>
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2 w-full">
                        <Button variant="outline" onClick={() => holdOrder()} disabled={cart.length === 0 || !selectedStaffId || paymentStatus === 'processing'}>
                            <Hand /> Hold
                        </Button>
                        <AlertDialog>
                            <AlertDialogTrigger asChild>
                                <Button variant="destructive" disabled={cart.length === 0 || !selectedStaffId || paymentStatus === 'processing'}>
                                    <Trash2/> Clear
                                </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                                <AlertDialogHeader>
                                <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                                <AlertDialogDescription>
                                    This will clear all items from the current cart. This action cannot be undone.
                                </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction onClick={clearCart}>Yes, Clear Cart</AlertDialogAction>
                                </AlertDialogFooter>
                            </AlertDialogContent>
                        </AlertDialog>
                    </div>
                    <Button size="lg" className="w-full font-bold text-lg" disabled={cart.length === 0 || !selectedStaffId || paymentStatus === 'processing'} onClick={() => setIsCheckoutOpen(true)}>
                        {paymentStatus === 'processing' && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>}
                        {paymentStatus === 'processing' ? 'Processing...' : 'Checkout'}
                    </Button>
                </CardFooter>
            </Card>
       </div>
      </div>

       {/* ---- DIALOGS ---- */}
       <ProductEditDialog
          product={editingProduct}
          onOpenChange={setEditingProduct}
          onProductUpdate={() => selectedStaffId && fetchProductsForStaff(selectedStaffId)}
          user={user}
          categories={categories}
        />

        {/* Manager Staff Selection Dialog */}
        <Dialog open={isStaffSelectionOpen} onOpenChange={setIsStaffSelectionOpen}>
            <DialogContent onInteractOutside={(e) => {
                if(!selectedStaffId) e.preventDefault();
            }}>
                <DialogHeader>
                    <DialogTitle>Select Staff POS</DialogTitle>
                    <DialogDescription>
                        Choose a showroom staff member to operate the Point of Sale on their behalf. Sales will be deducted from their inventory.
                    </DialogDescription>
                </DialogHeader>
                <div className="py-4">
                     <Select onValueChange={handleSelectStaff}>
                        <SelectTrigger>
                            <SelectValue placeholder="Select a staff member..." />
                        </SelectTrigger>
                        <SelectContent>
                            {allStaff.map(staff => (
                                <SelectItem key={staff.staff_id} value={staff.staff_id}>
                                    {staff.name} ({staff.role})
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
            </DialogContent>
        </Dialog>


        {/* Checkout Method Dialog */}
        <Dialog open={isCheckoutOpen} onOpenChange={setIsCheckoutOpen}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Select Payment Method</DialogTitle>
                    <DialogDescription>
                        Total Amount: <span className="font-bold text-foreground">₦{total.toFixed(2)}</span>
                    </DialogDescription>
                </DialogHeader>
                 <div className="grid grid-cols-1 gap-4 py-4">
                    <AlertDialog>
                        <AlertDialogTrigger asChild>
                            <Button type="button" variant="outline" className="h-20 text-lg w-full">
                                <Wallet className="mr-2 h-6 w-6" />
                                Pay with Cash
                            </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                            <AlertDialogHeader>
                                <AlertDialogTitle>Confirm Cash Payment</AlertDialogTitle>
                                <AlertDialogDescription>Confirm receipt of <strong>{`₦${total.toFixed(2)}`}</strong> in cash.</AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction onClick={() => handleSinglePayment('Cash')}>Confirm</AlertDialogAction>
                            </AlertDialogFooter>
                        </AlertDialogContent>
                    </AlertDialog>

                     <AlertDialog>
                        <AlertDialogTrigger asChild>
                            <Button type="button" variant="outline" className="h-20 text-lg w-full">
                                <CreditCard className="mr-2 h-6 w-6" />
                                Pay with POS
                            </Button>
                        </AlertDialogTrigger>
                         <AlertDialogContent>
                            <AlertDialogHeader>
                                <AlertDialogTitle>Confirm POS Payment</AlertDialogTitle>
                                <AlertDialogDescription>Confirm successful POS transaction of <strong>{`₦${total.toFixed(2)}`}</strong>.</AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction onClick={() => handleSinglePayment('POS')}>Confirm</AlertDialogAction>
                            </AlertDialogFooter>
                        </AlertDialogContent>
                    </AlertDialog>
                    
                    <Button className="h-20 text-lg w-full font-bold bg-primary hover:bg-primary/90 text-primary-foreground" onClick={() => handleSinglePayment('Paystack')}>
                        <ArrowRightLeft className="mr-2 h-6 w-6"/>
                        Pay with Paystack
                    </Button>
                    <Separator className="my-2"/>
                    <Button variant="secondary" className="w-full h-12" onClick={() => { setIsCheckoutOpen(false); setIsSplitPaymentOpen(true); }}>
                        <FileSignature className="mr-2 h-5 w-5"/>
                        Split Payment
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
        
        <SplitPaymentDialog 
            isOpen={isSplitPaymentOpen}
            onOpenChange={setIsSplitPaymentOpen}
            total={total}
            onFinalize={handleFinalizeSplitOrder}
            onHold={(payments) => {holdOrder(payments); setIsSplitPaymentOpen(false);}}
            user={user}
        />

        {/* Receipt Dialog */}
        <Dialog open={isReceiptOpen} onOpenChange={setIsReceiptOpen}>
            <DialogContent className="sm:max-w-xs print:max-w-full print:border-none print:shadow-none">
                {lastCompletedOrder && <Receipt order={lastCompletedOrder} storeAddress={storeAddress} ref={receiptRef} />}
                <DialogFooter className="flex-row justify-end gap-2 print:hidden">
                    <Button variant="outline" onClick={() => handlePrint(receiptRef.current)}><Printer className="mr-2 h-4 w-4"/> Print</Button>
                    <DialogClose asChild>
                      <Button onClick={() => {setIsReceiptOpen(false); setLastCompletedOrder(null);}}>Close</Button>
                    </DialogClose>
                </DialogFooter>
            </DialogContent>
        </Dialog>
     </>
  );
}

function POSPageWithSuspense() {
    return (
        <Suspense fallback={<div className="flex justify-center items-center h-full"><Loader2 className="h-16 w-16 animate-spin" /></div>}>
            <POSPageContent />
        </Suspense>
    )
}

export default function POSPageWithTypes() {
  return <POSPageWithSuspense />;
}
