export type Product = {
  id: string;
  title: string;
  description: string;
  price: number;
};

export type ProductCreateData = {
  title: string;
  description: string;
  price: number;
  count: number;
};
