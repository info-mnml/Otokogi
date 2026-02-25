// Inspired by react-hot-toast library
import * as React from "react"

import type {
  ToastActionElement,
  ToastProps,
} from "@/components/ui/toast"

const TOAST_LIMIT = 5
const TOAST_REMOVE_DELAY = 5000

type ToasterToast = ToastProps & {
  id: string
  title?: React.ReactNode
  description?: React.ReactNode
  action?: ToastActionElement
}

const actionTypes = {
  ADD_TOAST: "ADD_TOAST",
  UPDATE_TOAST: "UPDATE_TOAST",
  DISMISS_TOAST: "DISMISS_TOAST",
  REMOVE_TOAST: "REMOVE_TOAST",
} as const

type ActionType = typeof actionTypes

type Action =
  | {
      type: ActionType["ADD_TOAST"]
      toast: ToasterToast
    }
  | {
      type: ActionType["UPDATE_TOAST"]
      toast: Partial<ToasterToast> & { id: string }
    }
  | {
      type: ActionType["DISMISS_TOAST"]
      toastId?: string
    }
  | {
      type: ActionType["REMOVE_TOAST"]
      toastId?: string
    }

interface State {
  toasts: ToasterToast[]
}

const toastTimeouts = new Map<string, ReturnType<typeof setTimeout>>()

const reducer = (state: State, action: Action): State => {
  switch (action.type) {
    case "ADD_TOAST":
      return {
        ...state,
        toasts: [action.toast, ...state.toasts].slice(0, TOAST_LIMIT),
      }

    case "UPDATE_TOAST":
      return {
        ...state,
        toasts: state.toasts.map((t) =>
          t.id === action.toast.id ? { ...t, ...action.toast } : t
        ),
      }

    case "DISMISS_TOAST": {
      const { toastId } = action

      // ! Side effects ! - This could be extracted into a dismissToast() action,
      // but I'll keep it here for simplicity
      if (toastId) {
        if (toastTimeouts.has(toastId)) {
          clearTimeout(toastTimeouts.get(toastId))
          toastTimeouts.delete(toastId)
        }
      } else {
        for (const [id, timeout] of toastTimeouts.entries()) {
          clearTimeout(timeout)
          toastTimeouts.delete(id)
        }
      }

      return {
        ...state,
        toasts: state.toasts.map((t) =>
          t.id === toastId || toastId === undefined
            ? {
                ...t,
                open: false,
              }
            : t
        ),
      }
    }
    case "REMOVE_TOAST":
      if (action.toastId === undefined) {
        return {
          ...state,
          toasts: [],
        }
      }
      return {
        ...state,
        toasts: state.toasts.filter((t) => t.id !== action.toastId),
      }
  }
}

const useToast = () => {
  const [state, dispatch] = React.useReducer(reducer, {
    toasts: [],
  })

  React.useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        dispatch({
          type: "DISMISS_TOAST",
        })
      }
    }

    window.addEventListener("keydown", handleKeyDown)

    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [])

  const toast = React.useMemo(
    () => ({
      ...state,
      toast: (props: Omit<ToasterToast, "id">) => {
        const id = crypto.randomUUID()
        const newToast = { id, ...props }

        dispatch({
          type: "ADD_TOAST",
          toast: newToast,
        })

        return id
      },
      update: (id: string, props: Partial<Omit<ToasterToast, "id">>) => {
        if (!id) return

        dispatch({
          type: "UPDATE_TOAST",
          toast: { id, ...props },
        })
      },
      dismiss: (toastId?: string) => {
        dispatch({
          type: "DISMISS_TOAST",
          toastId,
        })
      },
      remove: (toastId?: string) => {
        dispatch({
          type: "REMOVE_TOAST",
          toastId,
        })
      },
    }),
    [state]
  )

  return toast
}

type Toast = ReturnType<typeof useToast>

const ToastContext = React.createContext<Toast | null>(null)

function ToastProvider({
  children,
}: {
  children: React.ReactNode
}) {
  const toast = useToast()

  return (
    <ToastContext.Provider value={toast}>
      {children}
    </ToastContext.Provider>
  )
}

function useToastContext() {
  const context = React.useContext(ToastContext)

  if (context === null) {
    throw new Error("useToast must be used within a ToastProvider")
  }

  return context
}

export {
  useToast,
  useToastContext,
  ToastProvider,
}
