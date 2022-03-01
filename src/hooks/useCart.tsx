import {
  createContext,
  ReactNode,
  useContext,
  useEffect,
  useRef,
  useState
} from "react"
import { toast } from "react-toastify"
import { api } from "../services/api"
import { Product, Stock } from "../types"

interface CartProviderProps {
  children: ReactNode
}

interface UpdateProductAmount {
  productId: number
  amount: number
}

interface CartContextData {
  cart: Product[]
  addProduct: (productId: number) => Promise<void>
  removeProduct: (productId: number) => void
  updateProductAmount: ({ productId, amount }: UpdateProductAmount) => void
}

const CartContext = createContext<CartContextData>({} as CartContextData)

export function CartProvider({ children }: CartProviderProps): JSX.Element {
  const [cart, setCart] = useState<Product[]>(() => {
    const storagedCart = localStorage.getItem("@RocketShoes:cart")

    if (storagedCart) {
      return JSON.parse(storagedCart)
    }

    return []
  })

  const prevCartRef = useRef<Product[]>()

  useEffect(() => {
    prevCartRef.current = cart
  })

  const cartPreviousValue = prevCartRef.current ?? cart

  useEffect(() => {
    if (cartPreviousValue !== cart) {
      localStorage.setItem("@RocketShoes:cart", JSON.stringify(cart))
    }
  }, [cart, cartPreviousValue])

  const addProduct = async (productId: number) => {
    try {
      const currentCart = [...cart]
      const productToBeAdded = isProductAlreadyInCart(productId, currentCart)
      const stockResponse = await api.get(`stock/${productId}`)
      const stockAmount = stockResponse.data.amount

      if (productToBeAdded) {
        if (productToBeAdded?.amount + 1 > stockAmount) {
          toast.error("Quantidade solicitada fora de estoque")
          return
        }
        productToBeAdded.amount += 1
      } else {
        const responseProduct = await api.get(`products/${productId}`)
        const firstTimeProduct = { ...responseProduct.data, amount: 1 }
        currentCart.push(firstTimeProduct)
      }

      setCart(currentCart)
    } catch {
      toast.error("Erro na adição do produto")
    }
  }

  function isProductAlreadyInCart(productId: number, currentCart: Product[]) {
    return currentCart.find(product => product.id === productId)
  }

  const removeProduct = (productId: number) => {
    try {
      const currentCart = [...cart]
      const indexToBeRemoved = currentCart.findIndex(
        product => product.id === productId
      )
      if (indexToBeRemoved >= 0) {
        currentCart.splice(indexToBeRemoved, 1)
        setCart(currentCart)
      } else return toast.error("Erro na remoção do produto")
    } catch {
      toast.error("Erro na remoção do produto")
    }
  }

  const updateProductAmount = async ({
    productId,
    amount
  }: UpdateProductAmount) => {
    try {
      if (amount <= 0) return

      const stockResponse = await api.get(`stock/${productId}`)
      const stockAmount = stockResponse.data.amount
      if (amount > stockAmount) {
        toast.error("Quantidade solicitada fora de estoque")
        return
      }
      const currentCart = [...cart]
      const productToBeUpdated = currentCart.find(
        product => product.id === productId
      )

      if (productToBeUpdated) {
        productToBeUpdated.amount = amount
        setCart(currentCart)
      } else return toast.error("Erro na alteração de quantidade do produto")
    } catch {
      toast.error("Erro na alteração de quantidade do produto")
    }
  }

  return (
    <CartContext.Provider
      value={{ cart, addProduct, removeProduct, updateProductAmount }}
    >
      {children}
    </CartContext.Provider>
  )
}

export function useCart(): CartContextData {
  const context = useContext(CartContext)

  return context
}
