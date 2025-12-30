

"use client";

import { useState, useMemo, useEffect, useCallback } from "react";
import Image from "next/image";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  TableFooter
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MoreHorizontal, PlusCircle, FileUp, Loader2, ArrowDownUp, Settings, Trash2, Edit, Check } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem
} from "@/components/ui/dropdown-menu";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
} from "@/components/ui/dialog";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { collection, onSnapshot, addDoc, updateDoc, deleteDoc, doc, getDocs, query, where, orderBy } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useToast } from "@/hooks/use-toast";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { format } from "date-fns";

type Product = {
  id: string;
  name: string;
  price: number;
  stock: number;
  unit: string;
  category: string;
  image: string;
  "data-ai-hint": string;
  costPrice?: number;
  lowStockThreshold?: number;
  minPrice?: number;
  maxPrice?: number;
};

type User = {
  name: string;
  role: string;
  staff_id: string;
};

type ProductCategory = {
  id: string;
  name: string;
}

const getStatusBadge = (stock: number, threshold?: number) => {
  const lowStock = threshold || 20;
  if (stock === 0) {
    return <Badge variant="destructive">Out of Stock</Badge>;
  }
  if (stock < lowStock) {
    return <Badge variant="secondary">Low Stock</Badge>;
  }
  return <Badge>In Stock</Badge>;
};


function ProductDialog({ product, onSave, onOpenChange, categories, user }: { product: Product | null, onSave: (p: Omit<Product, 'id'>) => void, onOpenChange: (open: boolean) => void, categories: ProductCategory[], user: User | null }) {
    const [name, setName] = useState("");
    const [category, setCategory] = useState("");
    const [costPrice, setCostPrice] = useState(0);
    const [price, setPrice] = useState(0);
    const [minPrice, setMinPrice] = useState<number | string>('');
    const [maxPrice, setMaxPrice] = useState<number | string>('');
    const [stock, setStock] = useState(0);
    const [unit, setUnit] = useState("");
    const [lowStockThreshold, setLowStockThreshold] = useState<number | string>(20);
    
    const isAccountant = user?.role === 'Accountant';
    const isDeveloper = user?.role === 'Developer';

    const handleSubmit = () => {
        const newProductData = {
            name,
            category,
            costPrice: Number(costPrice),
            price: Number(price),
            minPrice: Number(minPrice) || Number(price),
            maxPrice: Number(maxPrice) || Number(price),
            stock: Number(stock),
            unit: unit,
            image: product?.image || "https://placehold.co/150x150.png",
            "data-ai-hint": product?.['data-ai-hint'] || "product image",
            lowStockThreshold: Number(lowStockThreshold),
        };
        onSave(newProductData);
        onOpenChange(false);
    }

    useEffect(() => {
        if (product) {
            setName(product.name || "");
            setCategory(product.category || "");
            setCostPrice(product.costPrice || 0);
            setPrice(product.price || 0);
            setMinPrice(product.minPrice || '');
            setMaxPrice(product.maxPrice || '');
            setStock(product.stock || 0);
            setUnit(product.unit || "");
            setLowStockThreshold(product.lowStockThreshold || 20);
        } else {
            setName("");
            setCategory(categories[0]?.name || "");
            setCostPrice(0);
            setPrice(0);
            setMinPrice('');
            setMaxPrice('');
            setStock(0);
            setUnit("");
            setLowStockThreshold(20);
        }
    }, [product, categories]);
    
    const isOpen = product !== null;

    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>{product?.id ? "Edit Product" : "Add New Product"}</DialogTitle>
                    <DialogDescription>
                        {product?.id ? "Update the details of this product." : "Fill in the details for the new product."}
                    </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4 max-h-[70vh] overflow-y-auto pr-4">
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="name" className="text-right">Name</Label>
                        <Input id="name" value={name} onChange={(e) => setName(e.target.value)} className="col-span-3" disabled={isAccountant} />
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="category" className="text-right">Category</Label>
                        <Select value={category} onValueChange={setCategory} disabled={isAccountant}>
                            <SelectTrigger className="col-span-3">
                                <SelectValue placeholder="Select a category" />
                            </SelectTrigger>
                            <SelectContent>
                                {categories.map(cat => (
                                    <SelectItem key={cat.id} value={cat.name}>{cat.name}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                     <div className="grid grid-cols-2 gap-4">
                        <div className="grid gap-2">
                            <Label htmlFor="costPrice">Cost Price (₦)</Label>
                            <Input id="costPrice" type="number" value={costPrice} onChange={(e) => setCostPrice(parseFloat(e.target.value))} />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="price">Selling Price (₦)</Label>
                            <Input id="price" type="number" value={price} onChange={(e) => setPrice(parseFloat(e.target.value))} />
                        </div>
                    </div>
                     <div className="grid grid-cols-2 gap-4">
                        <div className="grid gap-2">
                            <Label htmlFor="minPrice">Min Price (₦)</Label>
                            <Input id="minPrice" type="number" placeholder="e.g. 500" value={minPrice} onChange={(e) => setMinPrice(e.target.value)} />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="maxPrice">Max Price (₦)</Label>
                            <Input id="maxPrice" type="number" placeholder="e.g. 600" value={maxPrice} onChange={(e) => setMaxPrice(e.target.value)} />
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                         <div className="grid gap-2">
                            <Label htmlFor="stock">Stock</Label>
                            <Input id="stock" type="number" value={stock} onChange={(e) => setStock(parseInt(e.target.value))} disabled={!isDeveloper}/>
                         </div>
                         <div className="grid gap-2">
                            <Label htmlFor="unit">Unit</Label>
                            <Input id="unit" placeholder="e.g., loaf, pcs" value={unit} onChange={(e) => setUnit(e.target.value)} disabled={isAccountant}/>
                         </div>
                    </div>
                    <div className="grid gap-2">
                        <Label htmlFor="low-stock">Low Stock Threshold</Label>
                        <Input id="low-stock" type="number" value={lowStockThreshold} onChange={(e) => setLowStockThreshold(e.target.value)} disabled={isAccountant}/>
                        <p className="text-xs text-muted-foreground px-1">Get a 'Low Stock' warning when inventory falls below this number.</p>
                    </div>
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
                    <Button onClick={handleSubmit}>{product?.id ? "Save Changes" : "Create Product"}</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}

function ManageCategoriesDialog({ categories, disabled, onSave, onDelete, onUpdate }: { categories: ProductCategory[], disabled: boolean, onSave: (name: string) => Promise<void>, onDelete: (id: string) => Promise<void>, onUpdate: (id: string, newName: string) => Promise<void>}) {
    const [isOpen, setIsOpen] = useState(false);
    const [newCategoryName, setNewCategoryName] = useState("");
    const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null);
    const [editingName, setEditingName] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSave = async () => {
        if (!newCategoryName.trim()) return;
        setIsSubmitting(true);
        await onSave(newCategoryName);
        setNewCategoryName('');
        setIsSubmitting(false);
    }

    const handleEditClick = (category: ProductCategory) => {
        setEditingCategoryId(category.id);
        setEditingName(category.name);
    }
    
    const handleUpdate = async () => {
        if (!editingCategoryId || !editingName.trim()) return;
        setIsSubmitting(true);
        await onUpdate(editingCategoryId, editingName);
        setEditingCategoryId(null);
        setEditingName('');
        setIsSubmitting(false);
    }
    
    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
                <Button variant="outline" size="sm" disabled={disabled}>
                    <Settings className="mr-2" /> Manage Categories
                </Button>
            </DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Manage Product Categories</DialogTitle>
                    <DialogDescription>Add, edit, or remove product categories.</DialogDescription>
                </DialogHeader>
                <div className="py-4 space-y-4">
                    <div className="flex gap-2">
                        <Input 
                            placeholder="New category name..."
                            value={newCategoryName}
                            onChange={(e) => setNewCategoryName(e.target.value)}
                        />
                        <Button onClick={handleSave} disabled={isSubmitting}>
                            {isSubmitting && <Loader2 className="mr-2 animate-spin"/>} Add
                        </Button>
                    </div>
                    <div className="max-h-60 overflow-y-auto space-y-2 pr-2 border-t pt-4">
                        {categories.map(cat => (
                            <div key={cat.id} className="flex justify-between items-center bg-muted p-2 rounded-md">
                                {editingCategoryId === cat.id ? (
                                    <Input value={editingName} onChange={(e) => setEditingName(e.target.value)} className="h-8"/>
                                ) : (
                                    <span>{cat.name}</span>
                                )}
                                <div className="flex gap-1">
                                    {editingCategoryId === cat.id ? (
                                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={handleUpdate} disabled={isSubmitting}>
                                            <Check className="h-4 w-4 text-green-500" />
                                        </Button>
                                    ) : (
                                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleEditClick(cat)}>
                                            <Edit className="h-4 w-4" />
                                        </Button>
                                    )}
                                     <AlertDialog>
                                        <AlertDialogTrigger asChild>
                                            <Button variant="ghost" size="icon" className="h-8 w-8"><Trash2 className="h-4 w-4 text-destructive"/></Button>
                                        </AlertDialogTrigger>
                                        <AlertDialogContent>
                                            <AlertDialogHeader>
                                                <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                                                <AlertDialogDescription>
                                                    Deleting this category will not affect existing products, but it will be removed as an option. This action cannot be undone.
                                                </AlertDialogDescription>
                                            </AlertDialogHeader>
                                            <AlertDialogFooter>
                                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                                <AlertDialogAction onClick={() => onDelete(cat.id)}>Delete</AlertDialogAction>
                                            </AlertDialogFooter>
                                        </AlertDialogContent>
                                    </AlertDialog>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
                 <DialogFooter>
                    <Button variant="outline" onClick={() => setIsOpen(false)}>Close</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}

export default function ProductsPage() {
  const { toast } = useToast();
  const [user, setUser] = useState<User | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [productCategories, setProductCategories] = useState<ProductCategory[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [productToDelete, setProductToDelete] = useState<Product | null>(null);
  const [activeStockTab, setActiveStockTab] = useState("all");
  const [sort, setSort] = useState("name_asc");

  useEffect(() => {
    const storedUser = localStorage.getItem('loggedInUser');
    if (storedUser) {
        setUser(JSON.parse(storedUser));
    }

    const unsubProducts = onSnapshot(collection(db, "products"), (snapshot) => {
        const productsList = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })) as Product[];
        setProducts(productsList);
        if (isLoading) setIsLoading(false);
    }, (error) => {
        console.error("Error fetching products:", error);
        if (isLoading) setIsLoading(false);
    });
    
    const unsubCategories = onSnapshot(query(collection(db, "product_categories"), orderBy("name")), (snapshot) => {
        const categoriesList = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })) as ProductCategory[];
        setProductCategories(categoriesList);
    });

    return () => {
        unsubProducts();
        unsubCategories();
    };
  }, [isLoading]);

  const handleSaveProduct = async (productData: Omit<Product, 'id'>) => {
    try {
        if (editingProduct && editingProduct.id) {
            // Keep existing stock if not developer
            const finalData = (user?.role === 'Developer') ? productData : {...productData, stock: editingProduct.stock || 0};
            await updateDoc(doc(db, "products", editingProduct.id), finalData);
            toast({ title: "Success", description: "Product updated successfully." });
        } else {
            await addDoc(collection(db, "products"), { ...productData, stock: 0 });
            toast({ title: "Success", description: "Product created successfully." });
        }
    } catch (error) {
        console.error("Error saving product:", error);
        toast({ variant: "destructive", title: "Error", description: "Could not save product." });
    } finally {
        setEditingProduct(null);
    }
  };
  
  const handleDeleteProduct = async () => {
    if (!productToDelete) return;
    try {
        await deleteDoc(doc(db, "products", productToDelete.id));
        toast({ title: "Success", description: "Product deleted successfully." });
    } catch (error) {
        console.error("Error deleting product:", error);
        toast({ variant: "destructive", title: "Error", description: "Could not delete product." });
    } finally {
        setProductToDelete(null);
    }
  };

  const handleSaveCategory = async (name: string) => {
    try {
        await addDoc(collection(db, "product_categories"), { name });
        toast({ title: "Success", description: `Category "${name}" added.` });
    } catch (error) {
        toast({ variant: 'destructive', title: 'Error', description: 'Could not add category.' });
    }
  }

  const handleDeleteCategory = async (id: string) => {
     try {
        await deleteDoc(doc(db, "product_categories", id));
        toast({ title: "Success", description: `Category deleted.` });
    } catch (error) {
        toast({ variant: 'destructive', title: 'Error', description: 'Could not delete category.' });
    }
  }
  
  const handleUpdateCategory = async (id: string, newName: string) => {
    try {
        await updateDoc(doc(db, "product_categories", id), { name: newName });
        toast({ title: 'Success', description: 'Category updated.' });
    } catch (error) {
        toast({ variant: 'destructive', title: 'Error', description: 'Could not update category.' });
    }
  }


  const { productsWithFinancials, grandTotalValue } = useMemo(() => {
    let filtered = products.filter(p => {
        if (activeStockTab === 'all') return true;
        const threshold = p.lowStockThreshold || 20;
        if (activeStockTab === 'in-stock') return p.stock >= threshold;
        if (activeStockTab === 'low-stock') return p.stock > 0 && p.stock < threshold;
        if (activeStockTab === 'out-of-stock') return p.stock === 0;
        return true;
    });

    let grandTotalValue = 0;

    const productsWithFinancials = filtered.map(p => {
      const costPrice = Number(p.costPrice) || 0;
      const stock = Number(p.stock) || 0;
      const totalValue = stock * costPrice;
      grandTotalValue += totalValue;

      return { ...p, totalValue };
    });
    
    productsWithFinancials.sort((a, b) => {
        switch (sort) {
            case "name_asc": return a.name.localeCompare(b.name);
            case "name_desc": return b.name.localeCompare(a.name);
            case "price_asc": return a.price - b.price;
            case "price_desc": return b.price - a.price;
            case "stock_asc": return a.stock - b.stock;
            case "stock_desc": return b.stock - a.stock;
            case "category_asc": return a.category.localeCompare(b.category);
            case "category_desc": return b.category.localeCompare(a.category);
            default: return 0;
        }
    });

    return { productsWithFinancials, grandTotalValue };
  }, [products, activeStockTab, sort]);
  
  const canManageProducts = user?.role === 'Manager' || user?.role === 'Developer' || user?.role === 'Storekeeper';
  const canViewFinancials = user?.role === 'Manager' || user?.role === 'Supervisor' || user?.role === 'Developer' || user?.role === 'Accountant';
  const canAddProducts = user?.role === 'Manager' || user?.role === 'Developer' || user?.role === 'Storekeeper';

  return (
    <div className="flex flex-col gap-4">
      <ProductDialog 
            product={editingProduct} 
            onSave={handleSaveProduct}
            onOpenChange={() => setEditingProduct(null)}
            categories={productCategories}
            user={user}
        />

      <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold font-headline">Products</h1>
            <div className="flex items-center gap-2">
                {canAddProducts && (
                    <Button onClick={() => setEditingProduct({})}>
                        <PlusCircle className="mr-2 h-4 w-4" /> Add New Product
                    </Button>
                )}
                 <ManageCategoriesDialog 
                    categories={productCategories}
                    disabled={!canAddProducts}
                    onSave={handleSaveCategory}
                    onDelete={handleDeleteCategory}
                    onUpdate={handleUpdateCategory}
                />
            </div>
        </div>

        <Card>
            <CardHeader>
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div className="overflow-x-auto pb-2">
                    <Tabs value={activeStockTab} onValueChange={setActiveStockTab}>
                    <TabsList>
                        <TabsTrigger value="all">All</TabsTrigger>
                        <TabsTrigger value="in-stock">In Stock</TabsTrigger>
                        <TabsTrigger value="low-stock">Low Stock</TabsTrigger>
                        <TabsTrigger value="out-of-stock">Out of Stock</TabsTrigger>
                    </TabsList>
                    </Tabs>
                </div>
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="outline">
                            <ArrowDownUp className="mr-2 h-4 w-4" />
                            Sort By
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent>
                        <DropdownMenuRadioGroup value={sort} onValueChange={setSort}>
                            <DropdownMenuRadioItem value="name_asc">Name (A-Z)</DropdownMenuRadioItem>
                            <DropdownMenuRadioItem value="name_desc">Name (Z-A)</DropdownMenuRadioItem>
                            <DropdownMenuSeparator />
                             <DropdownMenuRadioItem value="category_asc">Category (A-Z)</DropdownMenuRadioItem>
                            <DropdownMenuRadioItem value="category_desc">Category (Z-A)</DropdownMenuRadioItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuRadioItem value="price_desc">Price (High-Low)</DropdownMenuRadioItem>
                            <DropdownMenuRadioItem value="price_asc">Price (Low-High)</DropdownMenuRadioItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuRadioItem value="stock_desc">Stock (High-Low)</DropdownMenuRadioItem>
                            <DropdownMenuRadioItem value="stock_asc">Stock (Low-High)</DropdownMenuRadioItem>
                        </DropdownMenuRadioGroup>
                    </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </CardHeader>
            <CardContent>
                <div className="overflow-x-auto">
                <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Selling Price</TableHead>
                    {canViewFinancials && <TableHead>Cost Price</TableHead>}
                    <TableHead>Stock</TableHead>
                    {canViewFinancials && <TableHead>Total Value</TableHead>}
                    <TableHead>
                      <span className="sr-only">Actions</span>
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    <TableRow>
                      <TableCell colSpan={canViewFinancials ? 8 : 6} className="h-24 text-center">
                        <Loader2 className="mx-auto h-8 w-8 animate-spin" />
                      </TableCell>
                    </TableRow>
                  ) : productsWithFinancials.length > 0 ? (
                    productsWithFinancials.map((product) => (
                      <TableRow 
                        key={product.id}
                      >
                        <TableCell className="font-medium">
                          <div className="flex items-center gap-3">
                            <Image
                              src={product.image}
                              alt={product.name}
                              width={40}
                              height={40}
                              className="rounded-md object-cover"
                              data-ai-hint={product["data-ai-hint"]}
                              unoptimized
                            />
                            <span>{product.name}</span>
                          </div>
                        </TableCell>
                         <TableCell>{product.category}</TableCell>
                        <TableCell>{getStatusBadge(product.stock, product.lowStockThreshold)}</TableCell>
                        <TableCell>₦{product.price.toFixed(2)}</TableCell>
                        {canViewFinancials && <TableCell>₦{(product.costPrice || 0).toFixed(2)}</TableCell>}
                        <TableCell>{product.stock > 0 ? `${product.stock} ${product.unit || ''}`.trim() : '--'}</TableCell>
                        {canViewFinancials && <TableCell>₦{product.totalValue.toFixed(2)}</TableCell>}
                        <TableCell>
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                <Button
                                    aria-haspopup="true"
                                    size="icon"
                                    variant="ghost"
                                >
                                    <MoreHorizontal className="h-4 w-4" />
                                    <span className="sr-only">Toggle menu</span>
                                </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                <DropdownMenuLabel>Actions</DropdownMenuLabel>
                                {canManageProducts && (
                                  <>
                                    <DropdownMenuItem onSelect={(e) => {e.stopPropagation(); setEditingProduct(product);}}>Edit</DropdownMenuItem>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem className="text-destructive" onSelect={(e) => {e.stopPropagation(); setProductToDelete(product)}}>
                                        Delete
                                    </DropdownMenuItem>
                                  </>
                                )}
                                </DropdownMenuContent>
                            </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={canViewFinancials ? 8 : 6} className="h-24 text-center">
                        No products found for this filter.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
                {canViewFinancials && (
                    <TableFooter>
                        <TableRow>
                            <TableCell colSpan={6} className="text-right font-bold">Grand Total Value</TableCell>
                            <TableCell className="font-bold">₦{grandTotalValue.toFixed(2)}</TableCell>
                            <TableCell></TableCell>
                        </TableRow>
                    </TableFooter>
                )}
              </Table>
              </div>
            </CardContent>
          </Card>
      
      <AlertDialog open={productToDelete !== null} onOpenChange={(open) => !open && setProductToDelete(null)}>
        <AlertDialogContent>
            <AlertDialogHeader>
                <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                <AlertDialogDescription>
                    This action cannot be undone. This will permanently delete the product "{productToDelete?.name}".
                </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleDeleteProduct}>Delete</AlertDialogAction>
            </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
