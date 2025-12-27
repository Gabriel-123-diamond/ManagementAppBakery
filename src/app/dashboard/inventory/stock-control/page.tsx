
"use client";

import { useState, useMemo, useEffect, useCallback } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Send,
  PlusCircle,
  Trash2,
  Package,
  ArrowRightLeft,
  Wrench,
  Trash,
  Hourglass,
  Loader2,
  Check,
  X,
  Truck,
  Eye,
  CheckCircle,
  XCircle,
  History,
  CalendarIcon,
} from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";

import { format, startOfDay, endOfDay } from "date-fns";
import { DateRange } from "react-day-picker";
import { cn } from "@/lib/utils";
import { collection, getDocs, query, where, orderBy, Timestamp, getDoc, doc, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useToast } from "@/hooks/use-toast";
import { handleInitiateTransfer, handleReportWaste, getPendingTransfersForStaff, handleAcknowledgeTransfer, Transfer, getCompletedTransfersForStaff, WasteLog, getWasteLogsForStaff, getProductionTransfers, ProductionBatch, approveIngredientRequest, declineProductionBatch, getProducts, getProductionBatches } from "@/app/actions";
import { Badge } from "@/components/ui/badge";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Dialog, DialogHeader, DialogTrigger, DialogContent, DialogTitle, DialogDescription, DialogFooter, DialogClose } from "@/components/ui/dialog";
import Link from "next/link";
import { Separator } from "@/components/ui/separator";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";

type User = {
    name: string;
    role: string;
    staff_id: string;
};

type TransferItem = {
  productId: string;
  productName: string;
  quantity: number;
};

type StaffMember = {
  id: string;
  name: string;
  role: string;
};

type Product = {
  id: string;
  name: string;
  stock: number;
};

type Ingredient = {
    id: string;
    name: string;
    unit: string;
    stock: number;
};

function TransferDetailsDialog({ transfer, isOpen, onOpenChange }: { transfer: Transfer | null, isOpen: boolean, onOpenChange: (open: boolean) => void }) {
    if (!transfer) return null;

    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-md">
                <DialogHeader>
                    <DialogTitle>Transfer Details: {transfer.id.substring(0, 6).toUpperCase()}</DialogTitle>
                    <DialogDescription>
                        Details for transfer from {transfer.from_staff_name} to {transfer.to_staff_name}.
                    </DialogDescription>
                </DialogHeader>
                <div className="py-4 space-y-4">
                    <div className="text-sm space-y-1">
                        <div className="flex justify-between"><span>Date Initiated:</span><span>{format(new Date(transfer.date), 'Pp')}</span></div>
                        <div className="flex justify-between"><span>Status:</span><Badge variant={transfer.status === 'pending' || transfer.status === 'pending_return' ? 'secondary' : transfer.status === 'completed' || transfer.status === 'active' || transfer.status === 'return_completed' ? 'default' : 'destructive'}>{transfer.status.replace(/_/g, ' ')}</Badge></div>
                        {transfer.time_received && <div className="flex justify-between"><span>Time Received:</span><span>{format(new Date(transfer.time_received), 'Pp')}</span></div>}
                        {transfer.time_completed && <div className="flex justify-between"><span>Time Completed:</span><span>{format(new Date(transfer.time_completed), 'Pp')}</span></div>}
                    </div>
                    <Separator/>
                    <h4 className="font-semibold">Items Transferred</h4>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Product</TableHead>
                                <TableHead className="text-right">Quantity</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {transfer.items.map(item => (
                                <TableRow key={item.productId}>
                                    <TableCell>{item.productName}</TableCell>
                                    <TableCell className="text-right">{item.quantity}</TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                    {transfer.notes && (
                         <div className="text-sm space-y-1 pt-2">
                            <p className="font-semibold">Notes from Sender:</p>
                            <p className="p-2 bg-muted rounded-md">{transfer.notes}</p>
                        </div>
                    )}
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)}>Close</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

function PaginationControls({
    visibleRows,
    setVisibleRows,
    totalRows
}: {
    visibleRows: number | 'all',
    setVisibleRows: (val: number | 'all') => void,
    totalRows: number
}) {
    const [inputValue, setInputValue] = useState<string>('');

    const handleApply = () => {
        const num = parseInt(inputValue, 10);
        if (!isNaN(num) && num > 0) {
            setVisibleRows(num);
        }
    };

    return (
        <div className="flex flex-wrap items-center justify-end gap-2 text-sm">
            <span>Show:</span>
            <Button variant={visibleRows === 10 ? "default" : "outline"} size="sm" onClick={() => setVisibleRows(10)}>10</Button>
            <Button variant={visibleRows === 20 ? "default" : "outline"} size="sm" onClick={() => setVisibleRows(20)}>20</Button>
            <Button variant={visibleRows === 50 ? "default" : "outline"} size="sm" onClick={() => setVisibleRows(50)}>50</Button>
            <Button variant={visibleRows === 'all' ? "default" : "outline"} size="sm" onClick={() => setVisibleRows('all')}>All ({totalRows})</Button>
             <div className="flex items-center gap-1">
                <Input 
                    type="number" 
                    className="h-8 w-16" 
                    placeholder="Custom"
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleApply()}
                />
                <Button size="sm" onClick={handleApply}>Apply</Button>
            </div>
        </div>
    )
}

function ApproveBatchDialog({ batch, user, allIngredients, onApproval }: { batch: ProductionBatch, user: User, allIngredients: Ingredient[], onApproval: () => void }) {
    const { toast } = useToast();
    const [isLoading, setIsLoading] = useState(false);
    const [isOpen, setIsOpen] = useState(false);
    
    const ingredientsWithStock = useMemo(() => {
        return batch.ingredients.map(reqIng => {
            const stockIng = allIngredients.find(sIng => sIng.id === reqIng.ingredientId);
            const stockAvailable = stockIng?.stock || 0;
            const hasEnough = stockAvailable >= reqIng.quantity;
            return { ...reqIng, stockAvailable, hasEnough };
        });
    }, [batch.ingredients, allIngredients]);

    const canApprove = ingredientsWithStock.every(ing => ing.hasEnough);
    
    const handleApprove = async () => {
        setIsLoading(true);
        const result = await approveIngredientRequest(batch.id, batch.ingredients, user);
        if (result.success) {
            toast({ title: 'Success', description: 'Batch approved and moved to production.' });
            onApproval();
            setIsOpen(false);
        } else {
            toast({ variant: 'destructive', title: 'Error', description: result.error });
        }
        setIsLoading(false);
    }

    const handleDecline = async () => {
        setIsLoading(true);
        const result = await declineProductionBatch(batch.id, user);
        if (result.success) {
            toast({ title: 'Success', description: 'Batch has been declined.' });
            onApproval();
            setIsOpen(false);
        } else {
            toast({ variant: 'destructive', title: 'Error', description: result.error });
        }
        setIsLoading(false);
    }

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild><Button size="sm">Review</Button></DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Approve Production Batch?</DialogTitle>
                    <DialogDescription>
                        Batch ID: {batch.id.substring(0,6)}...<br/>
                        Request for <strong>{batch.recipeName}</strong>. This will deduct ingredients from inventory.
                    </DialogDescription>
                    <DialogClose />
                </DialogHeader>
                <div className="max-h-60 overflow-y-auto">
                    <Table>
                        <TableHeader><TableRow><TableHead>Ingredient</TableHead><TableHead>Required</TableHead><TableHead>In Stock</TableHead><TableHead>Status</TableHead></TableRow></TableHeader>
                        <TableBody>
                            {ingredientsWithStock.map(ing => (
                                <TableRow key={ing.ingredientId}>
                                    <TableCell>{ing.ingredientName}</TableCell>
                                    <TableCell>{ing.quantity} {ing.unit}</TableCell>
                                    <TableCell>{ing.stockAvailable.toFixed(2)} {ing.unit}</TableCell>
                                    <TableCell>
                                        {ing.hasEnough ? <CheckCircle className="h-5 w-5 text-green-500" /> : <XCircle className="h-5 w-5 text-destructive" />}
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </div>
                <DialogFooter className="gap-2">
                     <Button variant="outline" onClick={() => setIsOpen(false)}>Cancel</Button>
                     <Button variant="destructive" onClick={handleDecline} disabled={isLoading}>
                        {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <XCircle className="mr-2 h-4 w-4" />}
                        Decline
                    </Button>
                     <Button onClick={handleApprove} disabled={isLoading || !canApprove}>
                        {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <CheckCircle className="mr-2 h-4 w-4"/>}
                        Approve
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}

function AcceptRunDialog({ transfer, onAccept }: { transfer: Transfer, onAccept: (id: string, action: 'accept' | 'decline') => void }) {
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isOpen, setIsOpen] = useState(false);

    const handleAction = async (action: 'accept' | 'decline') => {
        setIsSubmitting(true);
        await onAccept(transfer.id, action);
        setIsSubmitting(false);
        setIsOpen(false);
    }

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
                <Button size="sm">View & Acknowledge</Button>
            </DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Acknowledge Transfer: {transfer.id.substring(0, 6).toUpperCase()}</DialogTitle>
                    <DialogDescription>
                        You are about to accept responsibility for the following items. This action cannot be undone.
                    </DialogDescription>
                    <DialogClose />
                </DialogHeader>
                <div className="py-4 max-h-[400px] overflow-y-auto">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Product</TableHead>
                                <TableHead>Quantity</TableHead>
                                <TableHead className="text-right">Value</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {transfer.items.map(item => (
                                <TableRow key={item.productId}>
                                    <TableCell>{item.productName}</TableCell>
                                    <TableCell>{item.quantity}</TableCell>
                                    <TableCell className="text-right">₦{((item.price || 0) * item.quantity).toLocaleString()}</TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </div>
                {transfer.notes && (
                    <div className="text-sm space-y-1 mt-2">
                        <p className="font-semibold">Notes from Sender:</p>
                        <p className="p-2 bg-muted rounded-md">{transfer.notes}</p>
                    </div>
                )}
                <div className="font-bold text-lg flex justify-between border-t pt-4">
                    <span>Total Run Value:</span>
                    <span>₦{(transfer.totalValue || 0).toLocaleString()}</span>
                </div>
                <DialogFooter className="mt-4">
                     <Button variant="destructive" onClick={() => handleAction('decline')} disabled={isSubmitting}>
                        {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>} Decline
                    </Button>
                     <Button onClick={() => handleAction('accept')} disabled={isSubmitting}>
                        {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>} Accept
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}

function ReportWasteTab({ products, user, onWasteReported }: { products: { productId: string; productName: string; stock: number }[], user: User | null, onWasteReported: () => void }) {
    const { toast } = useToast();
    const [productId, setProductId] = useState("");
    const [quantity, setQuantity] = useState<number | string>(1);
    const [reason, setReason] = useState("");
    const [notes, setNotes] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);

    const selectedProduct = useMemo(() => products.find(p => p.productId === productId), [productId, products]);

    const handleSubmit = async () => {
        if (!productId || !quantity || !reason || !user) {
            toast({ variant: 'destructive', title: 'Error', description: 'Please fill all required fields.' });
            return;
        }

        const productStock = selectedProduct?.stock || 0;

        if (Number(quantity) > productStock) {
            toast({ variant: 'destructive', title: 'Error', description: `Cannot report more waste than available stock (${productStock}).` });
            return;
        }

        setIsSubmitting(true);
        const productCategory = (await getDoc(doc(db, 'products', productId))).data()?.category || 'Unknown';
        
        const result = await handleReportWaste({
            items: [{
              productId,
              productName: selectedProduct?.productName || 'Unknown Product',
              productCategory,
              quantity: Number(quantity),
            }],
            reason,
            notes
        }, user);

        if (result.success) {
            toast({ title: 'Success', description: 'Waste reported successfully. Inventory has been updated.' });
            setProductId("");
            setQuantity(1);
            setReason("");
            setNotes("");
            onWasteReported(); // Callback to refresh product list
        } else {
            toast({ variant: 'destructive', title: 'Error', description: result.error });
        }
        setIsSubmitting(false);
    }
    
    return (
        <Card className="flex-1">
            <CardHeader>
                <CardTitle className="flex items-center gap-2"><Trash /> Report Spoiled or Damaged Stock</CardTitle>
                <CardDescription>
                    Use this form to report any items that are no longer sellable from your personal stock. This will deduct the items from your inventory.
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
                 <div className="grid md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                        <Label htmlFor="waste-product">Product</Label>
                        <Select value={productId} onValueChange={setProductId}>
                            <SelectTrigger id="waste-product">
                                <SelectValue placeholder="Select a product" />
                            </SelectTrigger>
                            <SelectContent>
                                {products.map((p) => (
                                <SelectItem key={p.productId} value={p.productId}>
                                    {p.productName} (Stock: {p.stock})
                                </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                     <div className="space-y-2">
                        <Label htmlFor="waste-quantity">Quantity Wasted</Label>
                        <Input id="waste-quantity" type="number" min="1" value={quantity} onChange={e => setQuantity(Number(e.target.value))} />
                    </div>
                </div>
                 <div className="space-y-2">
                    <Label htmlFor="waste-reason">Reason for Waste</Label>
                    <Select value={reason} onValueChange={setReason}>
                        <SelectTrigger id="waste-reason">
                            <SelectValue placeholder="Select a reason" />
                        </SelectTrigger>
                        <SelectContent>
                           <SelectItem value="Spoiled">Spoiled / Expired</SelectItem>
                           <SelectItem value="Damaged">Damaged</SelectItem>
                           <SelectItem value="Burnt">Burnt (Production)</SelectItem>
                           <SelectItem value="Error">Error (Mistake)</SelectItem>
                           <SelectItem value="Other">Other</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
                <div className="space-y-2">
                    <Label htmlFor="waste-notes">Additional Notes (Optional)</Label>
                    <Textarea id="waste-notes" value={notes} onChange={e => setNotes(e.target.value)} />
                </div>
                <div className="flex justify-end">
                    <Button onClick={handleSubmit} disabled={isSubmitting}>
                        {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>}
                        Submit Report
                    </Button>
                </div>
            </CardContent>
        </Card>
    );
}

export default function StockControlPage() {
  const { toast } = useToast();
  const [user, setUser] = useState<User | null>(null);
  const [transferTo, setTransferTo] = useState("");
  const [isSalesRun, setIsSalesRun] = useState(false);
  const [isSalesRunDisabled, setIsSalesRunDisabled] = useState(false);
  const [notes, setNotes] = useState("");
  const [items, setItems] = useState<Partial<TransferItem>[]>([
    { productId: "", quantity: 1 },
  ]);
  
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [initiatedTransfers, setInitiatedTransfers] = useState<Transfer[]>([]);
  const [pendingTransfers, setPendingTransfers] = useState<Transfer[]>([]);
  const [productionTransfers, setProductionTransfers] = useState<Transfer[]>([]);
  const [allProductionBatches, setAllProductionBatches] = useState<ProductionBatch[]>([]);
  const [pendingBatches, setPendingBatches] = useState<ProductionBatch[]>([]);
  const [completedTransfers, setCompletedTransfers] = useState<Transfer[]>([]);
  const [myWasteLogs, setMyWasteLogs] = useState<WasteLog[]>([]);
  
  const [date, setDate] = useState<DateRange | undefined>();
  const [allPendingDate, setAllPendingDate] = useState<DateRange | undefined>();
  
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingBatches, setIsLoadingBatches] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [visiblePendingRows, setVisiblePendingRows] = useState<number | 'all'>(10);
  const [visibleHistoryRows, setVisibleHistoryRows] = useState<number | 'all'>(10);
  const [visibleLogRows, setVisibleLogRows] = useState<number | 'all'>(10);
  const [visibleAllPendingRows, setVisibleAllPendingRows] = useState<number | 'all'>(10);
  const [viewingTransfer, setViewingTransfer] = useState<Transfer | null>(null);
  
  const fetchPageData = async () => {
        const userStr = localStorage.getItem('loggedInUser');
        if (!userStr) {
            toast({ variant: 'destructive', title: 'Error', description: 'Could not identify user.' });
            setIsLoading(false);
            return;
        }
        const currentUser = JSON.parse(userStr);
        setUser(currentUser);

        try {
            const staffQuery = query(collection(db, "staff"), where("role", "!=", "Developer"));
            const staffSnapshot = await getDocs(staffQuery);
            setStaff(staffSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as StaffMember)));

            const userRole = currentUser.role;
            if (userRole === 'Manager' || userRole === 'Supervisor' || userRole === 'Storekeeper') {
                const productsSnapshot = await getDocs(collection(db, "products"));
                setProducts(productsSnapshot.docs.map(doc => ({ id: doc.id, name: doc.data().name, stock: doc.data().stock } as Product)));
            } else if (userRole === 'Delivery Staff') {
                 const personalStockQuery = collection(db, 'staff', currentUser.staff_id, 'personal_stock');
                const personalStockSnapshot = await getDocs(personalStockQuery);
                setProducts(personalStockSnapshot.docs.map(doc => ({ id: doc.data().productId, name: doc.data().productName, stock: doc.data().stock } as Product)));
            }
            
             const [pendingData, completedData, wasteData, prodTransfers, ingredientsSnapshot, initiatedTransfersSnapshot, allBatchesResult] = await Promise.all([
                getPendingTransfersForStaff(currentUser.staff_id),
                getCompletedTransfersForStaff(currentUser.staff_id),
                getWasteLogsForStaff(currentUser.staff_id),
                getProductionTransfers(),
                getDocs(collection(db, "ingredients")),
                getDocs(query(collection(db, "transfers"), orderBy("date", "desc"))),
                getProductionBatches(),
            ]);

            const allBatches = [...allBatchesResult.pending, ...allBatchesResult.in_production, ...allBatchesResult.completed, ...allBatchesResult.other];

            setPendingTransfers(pendingData);
            setCompletedTransfers(completedData);
            setMyWasteLogs(wasteData);
            setProductionTransfers(prodTransfers);
            setIngredients(ingredientsSnapshot.docs.map(doc => ({ id: doc.id, name: doc.data().name, unit: doc.data().unit, stock: doc.data().stock } as Ingredient)));
            setInitiatedTransfers(initiatedTransfersSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data(), date: (doc.data().date as Timestamp).toDate().toISOString() } as Transfer)));
            setAllProductionBatches(allBatches);

        } catch (error) {
            console.error("Error fetching data:", error);
            toast({ variant: "destructive", title: "Error", description: "Failed to load necessary data." });
        } finally {
            setIsLoading(false);
        }
    };

  useEffect(() => {
    setIsLoading(true);
    fetchPageData();

    setIsLoadingBatches(true);
    const userStr = localStorage.getItem('loggedInUser');
    if (userStr) {
        const currentUser = JSON.parse(userStr);

        const qPendingTransfers = query(collection(db, "transfers"), where('to_staff_id', '==', currentUser.staff_id), where('status', '==', 'pending'));
        const unsubTransfers = onSnapshot(qPendingTransfers, async (snapshot) => {
            const transfers = await Promise.all(snapshot.docs.map(async (docSnap) => {
                 const data = docSnap.data();
                 let totalValue = 0;
                 const itemsWithPrices = await Promise.all(
                    (data.items || []).map(async (item: any) => {
                        const productDoc = await getDoc(doc(db, 'products', item.productId));
                        const price = productDoc.exists() ? productDoc.data().price : 0;
                        totalValue += price * item.quantity;
                        return { ...item, price };
                    })
                );
                 return { 
                    id: docSnap.id,
                    ...data,
                    items: itemsWithPrices,
                    totalValue,
                    date: (data.date as Timestamp).toDate().toISOString(),
                 } as Transfer;
            }));
            setPendingTransfers(transfers);
        });
        
        const qPendingBatches = query(collection(db, 'production_batches'), where('status', '==', 'pending_approval'));
        const unsubBatches = onSnapshot(qPendingBatches, (snapshot) => {
            setPendingBatches(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data(), createdAt: doc.data().createdAt.toDate().toISOString() } as ProductionBatch)));
            setIsLoadingBatches(false);
        });

        return () => {
            unsubTransfers();
            unsubBatches();
        };
    }
  }, []);

  const handleTransferToChange = (staffId: string) => {
    setTransferTo(staffId);
    const selectedStaff = staff.find(s => s.id === staffId);
    if (selectedStaff) {
        if (selectedStaff.role === 'Delivery Staff') {
            setIsSalesRun(true);
            setIsSalesRunDisabled(true);
        } else if (selectedStaff.role === 'Showroom Staff') {
            setIsSalesRun(false);
            setIsSalesRunDisabled(true);
        } else {
            setIsSalesRun(false);
            setIsSalesRunDisabled(false);
        }
    }
  }


  const handleItemChange = (
    index: number,
    field: keyof TransferItem,
    value: string | number
  ) => {
    const newItems = [...items];
    const item = newItems[index];

    if (field === "productId") {
      const product = products.find(p => p.id === value);
      item.productId = value as string;
      item.productName = product?.name;
    } else {
        const product = products.find(p => p.id === item.productId);
        const newQuantity = Number(value);
        if (product && newQuantity > product.stock) {
            toast({
                variant: "destructive",
                title: "Stock Exceeded",
                description: `Cannot transfer more than ${product.stock} units of ${product.name}.`
            });
            item.quantity = product.stock;
        } else {
            item.quantity = newQuantity;
        }
    }
    setItems(newItems);
  };

  const handleAddItem = () => {
    setItems([...items, { productId: "", quantity: 1 }]);
  };

  const handleRemoveItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    if (!transferTo || items.some(i => !i.productId || !i.quantity) || !user) {
        toast({ variant: "destructive", title: "Error", description: "Please select a staff member and fill all item fields."});
        return;
    }

    for (const item of items) {
        const product = products.find(p => p.id === item.productId);
        if (!product || item.quantity! > product.stock) {
            toast({
                variant: "destructive",
                title: "Validation Error",
                description: `Stock for ${item.productName} is insufficient. Maximum: ${product?.stock}.`
            });
            return;
        }
    }

    setIsSubmitting(true);
    const staffMember = staff.find(s => s.id === transferTo);
    
    const transferData = {
        to_staff_id: transferTo,
        to_staff_name: staffMember?.name || 'Unknown',
        is_sales_run: isSalesRun,
        notes: notes,
        items: items as TransferItem[],
    }

    const result = await handleInitiateTransfer(transferData, user);

    if (result.success) {
        toast({ title: "Success", description: "Transfer initiated successfully." });
        setTransferTo("");
        setIsSalesRun(false);
        setNotes("");
        setItems([{ productId: "", quantity: 1 }]);
        fetchPageData();

    } else {
        toast({ variant: "destructive", title: "Error", description: result.error });
    }

    setIsSubmitting(false);
  };
  
  const handleAcknowledge = async (id: string, type: 'accept' | 'decline') => {
    setIsSubmitting(true);
    const result = await handleAcknowledgeTransfer(id, type);
    if (result.success) {
        const message = type === 'accept' ? 'Transfer accepted.' : 'Transfer has been declined.';
        toast({ title: 'Success', description: message });
        fetchPageData();
    } else {
        toast({ variant: 'destructive', title: 'Error', description: result.error });
    }
    setIsSubmitting(false);
  };

  const paginatedPending = useMemo(() => {
    return visiblePendingRows === 'all' ? pendingTransfers : pendingTransfers.slice(0, visiblePendingRows);
  }, [pendingTransfers, visiblePendingRows]);

  const paginatedHistory = useMemo(() => {
    return visibleHistoryRows === 'all' ? completedTransfers : completedTransfers.slice(0, visibleHistoryRows);
  }, [completedTransfers, visibleHistoryRows]);

  const allPendingTransfers = useMemo(() => {
    let filtered = initiatedTransfers.filter(t => t.status === 'pending');
    if (allPendingDate?.from) {
        const from = startOfDay(allPendingDate.from);
        const to = allPendingDate.to ? endOfDay(allPendingDate.to) : endOfDay(allPendingDate.from);
        filtered = filtered.filter(t => {
            const transferDate = new Date(t.date);
            return transferDate >= from && transferDate <= to;
        })
    }
    return filtered;
  }, [initiatedTransfers, allPendingDate]);

  const paginatedAllPending = useMemo(() => {
    return visibleAllPendingRows === 'all' ? allPendingTransfers : allPendingTransfers.slice(0, visibleAllPendingRows);
  }, [allPendingTransfers, visibleAllPendingRows]);
  
  const paginatedInitiatedLogs = useMemo(() => {
    let filtered = initiatedTransfers.filter(t => !t.notes?.includes('Return from production batch'));
    if (date?.from) {
        const from = startOfDay(date.from);
        const to = date.to ? endOfDay(date.to) : endOfDay(date.from);
        filtered = filtered.filter(t => {
            const transferDate = new Date(t.date);
            return transferDate >= from && transferDate <= to;
        })
    }
    return visibleLogRows === 'all' ? filtered : filtered.slice(0, visibleLogRows);
  }, [initiatedTransfers, visibleLogRows, date]);
  
  const getAvailableProductsForRow = (rowIndex: number) => {
    const selectedIdsInOtherRows = new Set(
        items.filter((_, i) => i !== rowIndex).map(item => item.productId)
    );
    return products.filter(p => !selectedIdsInOtherRows.has(p.id));
  };

  const userRole = user?.role;
  const canInitiateTransfer = userRole === 'Manager' || userRole === 'Supervisor' || userRole === 'Storekeeper' || userRole === 'Developer';
  
  if (!user) {
    return <div className="flex items-center justify-center h-full"><Loader2 className="h-8 w-8 animate-spin" /></div>;
  }
  
  if (!canInitiateTransfer) {
     return (
         <div className="flex flex-col gap-6">
             <h1 className="text-2xl font-bold font-headline">Stock Control</h1>
            <div className="flex flex-col lg:flex-row gap-6">
                 <div className="flex flex-col gap-6 flex-[2]">
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Package />
                                Acknowledge Incoming Stock
                                {pendingTransfers.length > 0 && <Badge variant="destructive">{pendingTransfers.length}</Badge>}
                            </CardTitle>
                            <CardDescription>Review and acknowledge stock transferred to you. Accepted Sales Runs will appear in your "Deliveries" tab.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Date</TableHead>
                                        <TableHead>From</TableHead>
                                        <TableHead>Type</TableHead>
                                        <TableHead>Items</TableHead>
                                        <TableHead className="text-right">Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {isLoading ? (
                                        <TableRow><TableCell colSpan={5} className="h-24 text-center"><Loader2 className="h-8 w-8 animate-spin" /></TableCell></TableRow>
                                    ) : paginatedPending.length === 0 ? (
                                        <TableRow><TableCell colSpan={5} className="h-24 text-center">No pending transfers.</TableCell></TableRow>
                                    ) : (
                                        paginatedPending.map(t => (
                                            <TableRow key={t.id}>
                                                <TableCell>{format(new Date(t.date), 'Pp')}</TableCell>
                                                <TableCell>{t.from_staff_name}</TableCell>
                                                <TableCell>
                                                    {t.is_sales_run ? <Badge variant="secondary"><Truck className="h-3 w-3 mr-1" />Sales Run</Badge> : <Badge variant="outline"><Package className="h-3 w-3 mr-1"/>Stock</Badge>}
                                                </TableCell>
                                                <TableCell>
                                                    {t.items.reduce((sum, item) => sum + item.quantity, 0)} items
                                                </TableCell>
                                                <TableCell className="text-right">
                                                    <AcceptRunDialog transfer={t} onAccept={handleAcknowledge} />
                                                </TableCell>
                                            </TableRow>
                                        ))
                                    )}
                                </TableBody>
                            </Table>
                        </CardContent>
                        <CardFooter>
                            <PaginationControls visibleRows={visiblePendingRows} setVisibleRows={setVisiblePendingRows} totalRows={pendingTransfers.length} />
                        </CardFooter>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2"><History /> My Transfer History</CardTitle>
                            <CardDescription>A log of all stock transfers you have successfully accepted.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Received</TableHead>
                                        <TableHead>Completed</TableHead>
                                        <TableHead>From</TableHead>
                                        <TableHead>Type</TableHead>
                                        <TableHead>Status</TableHead>
                                        <TableHead className="text-right">Action</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {isLoading ? (
                                    <TableRow><TableCell colSpan={6} className="h-24 text-center"><Loader2 className="h-8 w-8 animate-spin" /></TableCell></TableRow>
                                ) : paginatedHistory.length === 0 ? (
                                    <TableRow><TableCell colSpan={6} className="h-24 text-center">You have no completed transfers.</TableCell></TableRow>
                                ) : (
                                    paginatedHistory.map(t => (
                                        <TableRow key={t.id}>
                                            <TableCell>{t.time_received ? format(new Date(t.time_received), 'Pp') : 'N/A'}</TableCell>
                                            <TableCell>{t.time_completed ? format(new Date(t.time_completed), 'Pp') : 'N/A'}</TableCell>
                                            <TableCell>{t.from_staff_name}</TableCell>
                                            <TableCell>
                                                {t.is_sales_run ? <Badge variant="secondary"><Truck className="h-3 w-3 mr-1" />Sales Run</Badge> : <Badge variant="outline"><Package className="h-3 w-3 mr-1"/>Stock</Badge>}
                                            </TableCell>
                                            <TableCell><Badge>{t.status}</Badge></TableCell>
                                            <TableCell className="text-right">
                                                {t.is_sales_run && t.status === 'active' && (
                                                    <Button variant="outline" size="sm" asChild>
                                                        <Link href={`/dashboard/sales-runs?runId=${t.id}`}><Eye className="mr-2 h-4 w-4"/>Manage Run</Link>
                                                    </Button>
                                                )}
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                                </TableBody>
                            </Table>
                        </CardContent>
                         <CardFooter>
                            <PaginationControls visibleRows={visibleHistoryRows} setVisibleRows={setVisibleHistoryRows} totalRows={completedTransfers.length} />
                        </CardFooter>
                    </Card>
                </div>
                <div className="flex-1">
                    <ReportWasteTab products={products.map(p => ({ productId: p.id, productName: p.name, stock: p.stock }))} user={user} onWasteReported={fetchPageData} />
                </div>
            </div>
         </div>
     )
  }

  // Full view for admins
  const isStorekeeper = userRole === 'Storekeeper';
  return (
    <div className="flex flex-col gap-4">
       <TransferDetailsDialog transfer={viewingTransfer} isOpen={!!viewingTransfer} onOpenChange={() => setViewingTransfer(null)} />
      <div className="flex items-center gap-2">
        <h1 className="text-2xl font-bold font-headline">Stock Control</h1>
      </div>
      <Tabs defaultValue={userRole === 'Manager' || userRole === 'Developer' ? "log" : "initiate-transfer"}>
        <div className="overflow-x-auto pb-2">
            <TabsList>
                {isStorekeeper &&
                    <TabsTrigger value="initiate-transfer">
                        <Send className="mr-2 h-4 w-4" /> Initiate Transfer
                    </TabsTrigger>
                }
                 <TabsTrigger value="log" className="relative">
                    <History className="mr-2 h-4 w-4"/> Log
                </TabsTrigger>
            </TabsList>
        </div>
        <TabsContent value="initiate-transfer">
        <Card>
            <CardHeader>
            <CardTitle>Transfer Stock to Sales Floor</CardTitle>
            <CardDescription>
                Initiate a transfer of finished products from the main store to a
                sales staff member.
            </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
            <div className="grid md:grid-cols-2 gap-6">
                <div className="space-y-2">
                    <Label htmlFor="transfer-to">Transfer to</Label>
                    <Select value={transferTo} onValueChange={handleTransferToChange} disabled={isLoading}>
                    <SelectTrigger id="transfer-to">
                        <SelectValue placeholder="Select a staff member" />
                    </SelectTrigger>
                    <SelectContent>
                        {staff.filter(s => s.role === 'Showroom Staff' || s.role === 'Delivery Staff').map((s) => (
                        <SelectItem key={s.id} value={s.id}>
                            {s.name} ({s.role})
                        </SelectItem>
                        ))}
                    </SelectContent>
                    </Select>
                </div>
                <div className="flex items-end pb-2">
                    <div className="flex items-center space-x-2">
                        <Checkbox id="sales-run" checked={isSalesRun} onCheckedChange={(checked) => setIsSalesRun(checked as boolean)} disabled={isSalesRunDisabled}/>
                        <div className="grid gap-1.5 leading-none">
                            <label
                            htmlFor="sales-run"
                            className={cn("text-sm font-medium leading-none", isSalesRunDisabled ? "text-muted-foreground" : "peer-disabled:cursor-not-allowed peer-disabled:opacity-50")}
                            >
                            This is for a sales run
                            </label>
                            <p className="text-sm text-muted-foreground">
                            The recipient will manage sales for these items.
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            <div className="space-y-2">
                <Label>Items to Transfer</Label>
                <div className="space-y-2">
                {items.map((item, index) => {
                    const availableProducts = getAvailableProductsForRow(index);
                    return (
                        <div
                        key={index}
                        className="grid grid-cols-[1fr_120px_auto] gap-2 items-center"
                        >
                        <Select
                            value={item.productId}
                            onValueChange={(value) =>
                            handleItemChange(index, "productId", value)
                            }
                            disabled={isLoading}
                        >
                            <SelectTrigger>
                            <SelectValue placeholder="Select a product" />
                            </SelectTrigger>
                            <SelectContent>
                            {availableProducts.map((p) => (
                                <SelectItem key={p.id} value={p.id}>
                                {p.name} (Stock: {p.stock})
                                </SelectItem>
                            ))}
                            </SelectContent>
                        </Select>
                        <Input
                            type="number"
                            placeholder="Qty"
                            min="1"
                            value={item.quantity || ''}
                            onChange={(e) =>
                            handleItemChange(index, "quantity", e.target.value)
                            }
                        />
                        <Button
                            variant="destructive"
                            size="icon"
                            onClick={() => handleRemoveItem(index)}
                        >
                            <Trash2 className="h-4 w-4" />
                        </Button>
                        </div>
                    );
                })}
                </div>
                <Button
                variant="outline"
                size="sm"
                className="mt-2"
                onClick={handleAddItem}
                >
                <PlusCircle className="mr-2 h-4 w-4" /> Add Item
                </Button>
            </div>
            <div className="space-y-2">
                <Label htmlFor="notes">Notes (Optional)</Label>
                <Textarea id="notes" value={notes} onChange={(e) => setNotes(e.target.value)} />
            </div>
            <div className="flex justify-end">
                <Button onClick={handleSubmit} disabled={isSubmitting || isLoading}>
                    {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>}
                    Submit Transfer
                </Button>
            </div>
            </CardContent>
        </Card>
        </TabsContent>
          <TabsContent value="log">
            <Card>
                <CardHeader>
                    <CardTitle>Stock Control Log</CardTitle>
                    <CardDescription>A complete audit trail of all stock movements and production approvals.</CardDescription>
                </CardHeader>
                 <CardContent>
                    <Tabs defaultValue="initiated">
                        <TabsList>
                            <TabsTrigger value="initiated">Initiated Transfers</TabsTrigger>
                            <TabsTrigger value="batch-approvals">Batch Approvals</TabsTrigger>
                        </TabsList>
                        <TabsContent value="initiated" className="mt-4">
                            <div className="flex justify-end mb-4">
                               <Popover>
                                    <PopoverTrigger asChild>
                                        <Button id="date" variant={"outline"} className={cn("w-[260px] justify-start text-left font-normal", !date && "text-muted-foreground")}>
                                            <CalendarIcon className="mr-2 h-4 w-4" />
                                            {date?.from ? (date.to ? (<>{format(date.from, "LLL dd, y")} - {format(date.to, "LLL dd, y")}</>) : (format(date.from, "LLL dd, y"))) : (<span>Filter by date range</span>)}
                                        </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-auto p-0" align="end">
                                        <Calendar initialFocus mode="range" defaultMonth={date?.from} selected={date} onSelect={setDate} numberOfMonths={2} />
                                    </PopoverContent>
                                </Popover>
                            </div>
                            <Table>
                                <TableHeader><TableRow><TableHead>Date</TableHead><TableHead>From</TableHead><TableHead>To</TableHead><TableHead>Items</TableHead><TableHead>Status</TableHead><TableHead className="text-right">Actions</TableHead></TableRow></TableHeader>
                                <TableBody>
                                    {paginatedInitiatedLogs.map(t => (
                                        <TableRow key={t.id}>
                                            <TableCell>{t.date ? format(new Date(t.date), 'Pp') : 'N/A'}</TableCell>
                                            <TableCell>{t.from_staff_name}</TableCell>
                                            <TableCell>{t.to_staff_name}</TableCell>
                                            <TableCell>{t.items.reduce((s,i) => s + i.quantity, 0)}</TableCell>
                                            <TableCell><Badge variant={t.status === 'pending' || t.status === 'pending_return' ? 'secondary' : t.status === 'completed' || t.status === 'active' || t.status === 'return_completed' ? 'default' : 'destructive'}>{t.status.replace(/_/g, ' ')}</Badge></TableCell>
                                            <TableCell className="text-right"><Button variant="ghost" size="icon" onClick={() => setViewingTransfer(t)}><Eye className="h-4 w-4"/></Button></TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                            <CardFooter className="pt-4">
                                <PaginationControls visibleRows={visibleLogRows} setVisibleRows={setVisibleLogRows} totalRows={paginatedInitiatedLogs.length} />
                            </CardFooter>
                        </TabsContent>
                         <TabsContent value="batch-approvals" className="mt-4">
                             <Table>
                                <TableHeader><TableRow><TableHead>Date</TableHead><TableHead>Recipe</TableHead><TableHead>Requested By</TableHead><TableHead>Status</TableHead><TableHead>Actions</TableHead></TableRow></TableHeader>
                                <TableBody>
                                    {allProductionBatches.map(batch => (
                                         <TableRow key={batch.id}>
                                            <TableCell>{format(new Date(batch.createdAt), 'PPP')}</TableCell>
                                            <TableCell>{batch.recipeName}</TableCell>
                                            <TableCell>{batch.requestedByName}</TableCell>
                                            <TableCell><Badge variant={batch.status === 'pending_approval' ? 'secondary' : batch.status === 'completed' ? 'default' : 'destructive'}>{batch.status.replace(/_/g, ' ')}</Badge></TableCell>
                                            <TableCell><Button size="sm" variant="ghost">View Details</Button></TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </TabsContent>
                    </Tabs>
                </CardContent>
            </Card>
          </TabsContent>
      </Tabs>
    </div>
  );
}
