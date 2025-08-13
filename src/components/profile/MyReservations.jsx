import { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import Notification from "../shared/Notification";
import "../../styles/modal-animations.css";

function MyReservations({ user }) {
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [reservations, setReservations] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Inline cancellation state
  const [cancellingReservationId, setCancellingReservationId] = useState(null);
  const [cancelReason, setCancelReason] = useState("");
  const [cancelLoading, setCancelLoading] = useState(false);

  // Notification state
  const [notification, setNotification] = useState({
    isVisible: false,
    message: "",
    type: "success",
  });

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [totalReservations, setTotalReservations] = useState(0);
  const [limit, setLimit] = useState(10);
  const [hasMorePages, setHasMorePages] = useState(false);

  // Status counts from backend
  const [statusCounts, setStatusCounts] = useState({
    pending: 0,
    confirmed: 0,
    completed: 0,
    cancelled: 0,
  });

  // Debounce timeout ref
  const searchTimeoutRef = useRef(null);

  // Notification helper functions
  const showNotification = (message, type = "success") => {
    setNotification({
      isVisible: true,
      message,
      type,
    });
  };

  const hideNotification = () => {
    setNotification((prev) => ({ ...prev, isVisible: false }));
  };

  // Error message translation function
  const translateMessage = (message) => {
    const translations = {
      "Failed to fetch":
        "Bağlantı hatası oluştu. İnternet bağlantınızı kontrol edin.",
      "Network Error": "Ağ hatası oluştu. Lütfen tekrar deneyin.",
      Unauthorized: "Bu işlem için yetkiniz bulunmamaktadır.",
      "Not Found": "İstenen kaynak bulunamadı.",
      "Internal Server Error":
        "Sunucu hatası oluştu. Lütfen daha sonra tekrar deneyin.",
    };
    return translations[message] || message || "Bilinmeyen bir hata oluştu.";
  };

  // Fetch all reservations from backend
  const fetchAllReservations = async (page = 1, search = "") => {
    if (!isAuthenticated) {
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const searchParam = search ? `&search=${encodeURIComponent(search)}` : "";
      const response = await fetch(
        `http://localhost:5000/api/v1/booking/user/all?page=${page}${searchParam}`,
        {
          method: "GET",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
          },
        }
      );

      if (!response.ok) {
        if (response.status === 404) {
          // 404 means no reservations found - this is not an error, just empty results
          const emptyData = {
            bookings: [],
            total: 0,
            count: 0,
            limit: 10,
            pendingBookingCount: 0,
            confirmedBookingCount: 0,
            completedBookingCount: 0,
            cancelledBookingCount: 0,
          };

          setReservations([]);
          setTotalReservations(0);
          setLimit(emptyData.limit);
          setCurrentPage(1);
          setHasMorePages(false);
          setStatusCounts({
            pending: 0,
            confirmed: 0,
            completed: 0,
            cancelled: 0,
          });
          setLoading(false);
          return;
        }

        let errorMessage = "Rezervasyonlar yüklenirken bir hata oluştu.";
        if (response.status === 401) {
          errorMessage = "Bu işlem için giriş yapmanız gerekir.";
        } else if (response.status === 500) {
          errorMessage =
            "Sunucu hatası oluştu. Lütfen daha sonra tekrar deneyin.";
        }
        throw new Error(errorMessage);
      }

      const data = await response.json();

      // Process backend data to match frontend structure
      const processedReservations = data.bookings.map((booking) => {
        const startDate = new Date(booking.start);
        const now = new Date();
        const timeDiff = startDate.getTime() - now.getTime();
        const hoursDiff = timeDiff / (1000 * 3600);

        // Determine final status based on time and current status
        let finalStatus = booking.status;

        if (startDate < now) {
          if (booking.status === "confirmed") {
            finalStatus = "completed";
          } else if (booking.status === "pending") {
            finalStatus = "cancelled";
          }
        }

        return {
          id: booking._id,
          pitchName: booking.pitch.name,
          pitchId: booking.pitch._id,
          date: startDate.toLocaleDateString("tr-TR"),
          time: `${startDate.toLocaleTimeString("tr-TR", {
            hour: "2-digit",
            minute: "2-digit",
          })}-${new Date(
            startDate.getTime() + 1 * 60 * 60 * 1000
          ).toLocaleTimeString("tr-TR", {
            hour: "2-digit",
            minute: "2-digit",
          })}`,
          originalStatus: booking.status,
          status: finalStatus,
          price: booking.price.total,
          currency: booking.price.currency,
          location: `${booking.pitch.location.address.district}, ${booking.pitch.location.address.city}`,
          fullAddress: `${booking.pitch.location.address.street}, ${booking.pitch.location.address.neighborhood}, ${booking.pitch.location.address.district}/${booking.pitch.location.address.city}`,
          players: booking.totalPlayers,
          notes: booking.notes || "",
          bookedBy: booking.bookedBy.name,
          pitchRating: booking.pitch.rating.averageRating,
          totalReviews: booking.pitch.rating.totalReviews,
          facilities: booking.pitch.facilities,
          specifications: booking.pitch.specifications,
          contact: booking.pitch.contact,
          createdAt: new Date(booking.createdAt).toLocaleDateString("tr-TR"),
          updatedAt: new Date(booking.updatedAt).toLocaleDateString("tr-TR"),
          refundAllowed: booking.pitch.refundAllowed,
          paymentMethod: booking.price.method,
          paid: booking.price.paid,
          paidAt: booking.price.paidAt
            ? new Date(booking.price.paidAt).toLocaleDateString("tr-TR")
            : null,
          startDateTime: startDate,
          canCancel:
            finalStatus === "pending" ||
            (finalStatus === "confirmed" && hoursDiff > 48),
          isExpired: startDate < now,
          hoursDiff: hoursDiff,
          company: booking.company,
          cancelInfo: booking.cancel || null,
          cancelReason: booking.cancel?.reason || null,
          hasAdvert: false, // Will be updated by checkAdvertForBooking
          advertId: null,   // Will be updated by checkAdvertForBooking
        };
      });

      // Update reservations with advert status
      const reservationsWithAdvertStatus = await updateReservationsWithAdvertStatus(processedReservations);

      // If it's first page, replace reservations, otherwise append
      if (page === 1) {
        setReservations(reservationsWithAdvertStatus);
      } else {
        setReservations((prev) => [...prev, ...reservationsWithAdvertStatus]);
      }

      // Update pagination info
      setTotalReservations(data.total);
      setLimit(data.limit);
      setCurrentPage(page);
      setHasMorePages(data.total > page * data.limit);

      // Update status counts
      setStatusCounts({
        pending: data.pendingBookingCount,
        confirmed: data.confirmedBookingCount,
        completed: data.completedBookingCount,
        cancelled: data.cancelledBookingCount,
      });
    } catch (error) {
      console.error("Error fetching reservations:", error);
      setError(translateMessage(error.message));
      // On error, reset to empty state
      setReservations([]);
      setTotalReservations(0);
      setStatusCounts({
        pending: 0,
        confirmed: 0,
        completed: 0,
        cancelled: 0,
      });
    } finally {
      setLoading(false);
    }
  };

  // Fetch pending reservations from backend
  const fetchPendingReservations = async (page = 1, search = "") => {
    if (!isAuthenticated) {
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const searchParam = search ? `&search=${encodeURIComponent(search)}` : "";
      const response = await fetch(
        `http://localhost:5000/api/v1/booking/user/pending?page=${page}${searchParam}`,
        {
          method: "GET",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
          },
        }
      );

      if (!response.ok) {
        if (response.status === 404) {
          // 404 means no pending reservations found - this is not an error, just empty results
          setReservations([]);
          setTotalReservations(0);
          setLimit(10);
          setCurrentPage(1);
          setHasMorePages(false);
          setLoading(false);
          return;
        }

        let errorMessage =
          "Bekleyen rezervasyonlar yüklenirken bir hata oluştu.";
        if (response.status === 401) {
          errorMessage = "Bu işlem için giriş yapmanız gerekir.";
        } else if (response.status === 400) {
          errorMessage = "Geçersiz sayfa numarası.";
        } else if (response.status === 500) {
          errorMessage =
            "Sunucu hatası oluştu. Lütfen daha sonra tekrar deneyin.";
        }
        throw new Error(errorMessage);
      }

      const data = await response.json();

      // Process backend data to match frontend structure
      const processedReservations = data.bookings.map((booking) => {
        const startDate = new Date(booking.start);
        const now = new Date();
        const timeDiff = startDate.getTime() - now.getTime();
        const hoursDiff = timeDiff / (1000 * 3600);

        // For pending reservations, status should remain 'pending' unless expired
        let finalStatus = booking.status;
        if (startDate < now && booking.status === "pending") {
          finalStatus = "cancelled";
        }

        return {
          id: booking._id,
          pitchName: booking.pitch.name,
          pitchId: booking.pitch._id,
          date: startDate.toLocaleDateString("tr-TR"),
          time: `${startDate.toLocaleTimeString("tr-TR", {
            hour: "2-digit",
            minute: "2-digit",
          })}-${new Date(
            startDate.getTime() + 1 * 60 * 60 * 1000
          ).toLocaleTimeString("tr-TR", {
            hour: "2-digit",
            minute: "2-digit",
          })}`,
          originalStatus: booking.status,
          status: finalStatus,
          price: booking.price.total,
          currency: booking.price.currency,
          location: `${booking.pitch.location.address.district}, ${booking.pitch.location.address.city}`,
          fullAddress: `${booking.pitch.location.address.street}, ${booking.pitch.location.address.neighborhood}, ${booking.pitch.location.address.district}/${booking.pitch.location.address.city}`,
          players: booking.totalPlayers,
          notes: booking.notes || "",
          bookedBy: booking.bookedBy.name,
          pitchRating: booking.pitch.rating.averageRating,
          totalReviews: booking.pitch.rating.totalReviews,
          facilities: booking.pitch.facilities,
          specifications: booking.pitch.specifications,
          contact: booking.pitch.contact,
          createdAt: new Date(booking.createdAt).toLocaleDateString("tr-TR"),
          updatedAt: new Date(booking.updatedAt).toLocaleDateString("tr-TR"),
          refundAllowed: booking.pitch.refundAllowed,
          paymentMethod: booking.price.method,
          paid: booking.price.paid,
          paidAt: booking.price.paidAt
            ? new Date(booking.price.paidAt).toLocaleDateString("tr-TR")
            : null,
          startDateTime: startDate,
          canCancel:
            finalStatus === "pending" ||
            (finalStatus === "confirmed" && hoursDiff > 48),
          isExpired: startDate < now,
          hoursDiff: hoursDiff,
          company: booking.company,
          cancelInfo: booking.cancel || null,
          cancelReason: booking.cancel?.reason || null,
          hasAdvert: false, // Will be updated by checkAdvertForBooking
          advertId: null,   // Will be updated by checkAdvertForBooking
        };
      });

      // If it's first page, replace reservations, otherwise append
      if (page === 1) {
        setReservations(processedReservations);
      } else {
        setReservations((prev) => [...prev, ...processedReservations]);
      }

      // Update pagination info
      setTotalReservations(data.total);
      setLimit(data.limit);
      setCurrentPage(page);
      setHasMorePages(data.total > page * data.limit);

      // For pending tab, we only need to update the pending count
      // Don't reset other status counts as we're only fetching pending data
    } catch (error) {
      console.error("Error fetching pending reservations:", error);
      setError(translateMessage(error.message));
      // On error, reset to empty state
      setReservations([]);
      setTotalReservations(0);
    } finally {
      setLoading(false);
    }
  };

  // Fetch confirmed reservations from backend
  const fetchConfirmedReservations = async (page = 1, search = "") => {
    if (!isAuthenticated) {
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const searchParam = search ? `&search=${encodeURIComponent(search)}` : "";
      const response = await fetch(
        `http://localhost:5000/api/v1/booking/user/confirmed?page=${page}${searchParam}`,
        {
          method: "GET",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
          },
        }
      );

      if (!response.ok) {
        if (response.status === 404) {
          // 404 means no confirmed reservations found - this is not an error, just empty results
          setReservations([]);
          setTotalReservations(0);
          setLimit(10);
          setCurrentPage(1);
          setHasMorePages(false);
          setLoading(false);
          return;
        }

        let errorMessage =
          "Onaylanmış rezervasyonlar yüklenirken bir hata oluştu.";
        if (response.status === 401) {
          errorMessage = "Bu işlem için giriş yapmanız gerekir.";
        } else if (response.status === 400) {
          errorMessage = "Geçersiz sayfa numarası.";
        } else if (response.status === 500) {
          errorMessage =
            "Sunucu hatası oluştu. Lütfen daha sonra tekrar deneyin.";
        }
        throw new Error(errorMessage);
      }

      const data = await response.json();

      // Process backend data to match frontend structure
      const processedReservations = data.bookings.map((booking) => {
        const startDate = new Date(booking.start);
        const now = new Date();
        const timeDiff = startDate.getTime() - now.getTime();
        const hoursDiff = timeDiff / (1000 * 3600);

        // For confirmed reservations, status should remain 'confirmed' unless expired
        let finalStatus = booking.status;
        if (startDate < now && booking.status === "confirmed") {
          finalStatus = "completed";
        }

        return {
          id: booking._id,
          pitchName: booking.pitch.name,
          pitchId: booking.pitch._id,
          date: startDate.toLocaleDateString("tr-TR"),
          time: `${startDate.toLocaleTimeString("tr-TR", {
            hour: "2-digit",
            minute: "2-digit",
          })}-${new Date(
            startDate.getTime() + 1 * 60 * 60 * 1000
          ).toLocaleTimeString("tr-TR", {
            hour: "2-digit",
            minute: "2-digit",
          })}`,
          originalStatus: booking.status,
          status: finalStatus,
          price: booking.price.total,
          currency: booking.price.currency,
          location: `${booking.pitch.location.address.district}, ${booking.pitch.location.address.city}`,
          fullAddress: `${booking.pitch.location.address.street}, ${booking.pitch.location.address.neighborhood}, ${booking.pitch.location.address.district}/${booking.pitch.location.address.city}`,
          players: booking.totalPlayers,
          notes: booking.notes || "",
          bookedBy: booking.bookedBy.name,
          pitchRating: booking.pitch.rating.averageRating,
          totalReviews: booking.pitch.rating.totalReviews,
          facilities: booking.pitch.facilities,
          specifications: booking.pitch.specifications,
          contact: booking.pitch.contact,
          createdAt: new Date(booking.createdAt).toLocaleDateString("tr-TR"),
          updatedAt: new Date(booking.updatedAt).toLocaleDateString("tr-TR"),
          refundAllowed: booking.pitch.refundAllowed,
          paymentMethod: booking.price.method,
          paid: booking.price.paid,
          paidAt: booking.price.paidAt
            ? new Date(booking.price.paidAt).toLocaleDateString("tr-TR")
            : null,
          startDateTime: startDate,
          canCancel:
            finalStatus === "pending" ||
            (finalStatus === "confirmed" && hoursDiff > 48),
          isExpired: startDate < now,
          hoursDiff: hoursDiff,
          company: booking.company,
          cancelInfo: booking.cancel || null,
          cancelReason: booking.cancel?.reason || null,
          hasAdvert: false, // Will be updated by checkAdvertForBooking
          advertId: null,   // Will be updated by checkAdvertForBooking
        };
      });

      // If it's first page, replace reservations, otherwise append
      if (page === 1) {
        setReservations(processedReservations);
      } else {
        setReservations((prev) => [...prev, ...processedReservations]);
      }

      // Update pagination info
      setTotalReservations(data.total);
      setLimit(data.limit);
      setCurrentPage(page);
      setHasMorePages(data.total > page * data.limit);

      // For confirmed tab, we only need to update the confirmed count
      // Don't reset other status counts as we're only fetching confirmed data
    } catch (error) {
      console.error("Error fetching confirmed reservations:", error);
      setError(translateMessage(error.message));
      // On error, reset to empty state
      setReservations([]);
      setTotalReservations(0);
    } finally {
      setLoading(false);
    }
  };

  // Fetch completed reservations from backend
  const fetchCompletedReservations = async (page = 1, search = "") => {
    if (!isAuthenticated) {
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const searchParam = search ? `&search=${encodeURIComponent(search)}` : "";
      const response = await fetch(
        `http://localhost:5000/api/v1/booking/user/completed?page=${page}${searchParam}`,
        {
          method: "GET",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
          },
        }
      );

      if (!response.ok) {
        if (response.status === 404) {
          // 404 means no completed reservations found - this is not an error, just empty results
          setReservations([]);
          setTotalReservations(0);
          setLimit(10);
          setCurrentPage(1);
          setHasMorePages(false);
          setLoading(false);
          return;
        }

        let errorMessage =
          "Tamamlanmış rezervasyonlar yüklenirken bir hata oluştu.";
        if (response.status === 401) {
          errorMessage = "Bu işlem için giriş yapmanız gerekir.";
        } else if (response.status === 400) {
          errorMessage = "Geçersiz sayfa numarası.";
        } else if (response.status === 500) {
          errorMessage =
            "Sunucu hatası oluştu. Lütfen daha sonra tekrar deneyin.";
        }
        throw new Error(errorMessage);
      }

      const data = await response.json();

      // Process backend data to match frontend structure
      const processedReservations = data.bookings.map((booking) => {
        const startDate = new Date(booking.start);
        const now = new Date();
        const timeDiff = startDate.getTime() - now.getTime();
        const hoursDiff = timeDiff / (1000 * 3600);

        // For completed reservations, status should remain 'completed'
        let finalStatus = booking.status;

        return {
          id: booking._id,
          pitchName: booking.pitch.name,
          pitchId: booking.pitch._id,
          date: startDate.toLocaleDateString("tr-TR"),
          time: `${startDate.toLocaleTimeString("tr-TR", {
            hour: "2-digit",
            minute: "2-digit",
          })}-${new Date(
            startDate.getTime() + 1 * 60 * 60 * 1000
          ).toLocaleTimeString("tr-TR", {
            hour: "2-digit",
            minute: "2-digit",
          })}`,
          originalStatus: booking.status,
          status: finalStatus,
          price: booking.price.total,
          currency: booking.price.currency,
          location: `${booking.pitch.location.address.district}, ${booking.pitch.location.address.city}`,
          fullAddress: `${booking.pitch.location.address.street}, ${booking.pitch.location.address.neighborhood}, ${booking.pitch.location.address.district}/${booking.pitch.location.address.city}`,
          players: booking.totalPlayers,
          notes: booking.notes || "",
          bookedBy: booking.bookedBy.name,
          pitchRating: booking.pitch.rating.averageRating,
          totalReviews: booking.pitch.rating.totalReviews,
          facilities: booking.pitch.facilities,
          specifications: booking.pitch.specifications,
          contact: booking.pitch.contact,
          createdAt: new Date(booking.createdAt).toLocaleDateString("tr-TR"),
          updatedAt: new Date(booking.updatedAt).toLocaleDateString("tr-TR"),
          refundAllowed: booking.pitch.refundAllowed,
          paymentMethod: booking.price.method,
          paid: booking.price.paid,
          paidAt: booking.price.paidAt
            ? new Date(booking.price.paidAt).toLocaleDateString("tr-TR")
            : null,
          startDateTime: startDate,
          canCancel: false, // Completed reservations cannot be cancelled
          isExpired: startDate < now,
          hoursDiff: hoursDiff,
          company: booking.company,
          cancelInfo: booking.cancel || null,
          cancelReason: booking.cancel?.reason || null,
          hasAdvert: false, // Will be updated by checkAdvertForBooking
          advertId: null,   // Will be updated by checkAdvertForBooking
        };
      });

      // If it's first page, replace reservations, otherwise append
      if (page === 1) {
        setReservations(processedReservations);
      } else {
        setReservations((prev) => [...prev, ...processedReservations]);
      }

      // Update pagination info
      setTotalReservations(data.total);
      setLimit(data.limit);
      setCurrentPage(page);
      setHasMorePages(data.total > page * data.limit);

      // For completed tab, we only need to update the completed count
      // Don't reset other status counts as we're only fetching completed data
    } catch (error) {
      console.error("Error fetching completed reservations:", error);
      setError(translateMessage(error.message));
      // On error, reset to empty state
      setReservations([]);
      setTotalReservations(0);
    } finally {
      setLoading(false);
    }
  };

  // Fetch cancelled reservations from backend
  const fetchCancelledReservations = async (page = 1, search = "") => {
    if (!isAuthenticated) {
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const searchParam = search ? `&search=${encodeURIComponent(search)}` : "";
      const response = await fetch(
        `http://localhost:5000/api/v1/booking/user/cancelled?page=${page}${searchParam}`,
        {
          method: "GET",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
          },
        }
      );

      if (!response.ok) {
        if (response.status === 404) {
          // 404 means no cancelled reservations found - this is not an error, just empty results
          setReservations([]);
          setTotalReservations(0);
          setLimit(10);
          setCurrentPage(1);
          setHasMorePages(false);
          setLoading(false);
          return;
        }

        let errorMessage =
          "İptal edilmiş rezervasyonlar yüklenirken bir hata oluştu.";
        if (response.status === 401) {
          errorMessage = "Bu işlem için giriş yapmanız gerekir.";
        } else if (response.status === 400) {
          errorMessage = "Geçersiz sayfa numarası.";
        } else if (response.status === 500) {
          errorMessage =
            "Sunucu hatası oluştu. Lütfen daha sonra tekrar deneyin.";
        }
        throw new Error(errorMessage);
      }

      const data = await response.json();

      // Process backend data to match frontend structure
      const processedReservations = data.bookings.map((booking) => {
        const startDate = new Date(booking.start);
        const now = new Date();
        const timeDiff = startDate.getTime() - now.getTime();
        const hoursDiff = timeDiff / (1000 * 3600);

        // For cancelled reservations, status should remain 'cancelled'
        let finalStatus = booking.status;

        return {
          id: booking._id,
          pitchName: booking.pitch.name,
          pitchId: booking.pitch._id,
          date: startDate.toLocaleDateString("tr-TR"),
          time: `${startDate.toLocaleTimeString("tr-TR", {
            hour: "2-digit",
            minute: "2-digit",
          })}-${new Date(
            startDate.getTime() + 1 * 60 * 60 * 1000
          ).toLocaleTimeString("tr-TR", {
            hour: "2-digit",
            minute: "2-digit",
          })}`,
          originalStatus: booking.status,
          status: finalStatus,
          price: booking.price.total,
          currency: booking.price.currency,
          location: `${booking.pitch.location.address.district}, ${booking.pitch.location.address.city}`,
          fullAddress: `${booking.pitch.location.address.street}, ${booking.pitch.location.address.neighborhood}, ${booking.pitch.location.address.district}/${booking.pitch.location.address.city}`,
          players: booking.totalPlayers,
          notes: booking.notes || "",
          bookedBy: booking.bookedBy.name,
          pitchRating: booking.pitch.rating.averageRating,
          totalReviews: booking.pitch.rating.totalReviews,
          facilities: booking.pitch.facilities,
          specifications: booking.pitch.specifications,
          contact: booking.pitch.contact,
          createdAt: new Date(booking.createdAt).toLocaleDateString("tr-TR"),
          updatedAt: new Date(booking.updatedAt).toLocaleDateString("tr-TR"),
          refundAllowed: booking.pitch.refundAllowed,
          paymentMethod: booking.price.method,
          paid: booking.price.paid,
          paidAt: booking.price.paidAt
            ? new Date(booking.price.paidAt).toLocaleDateString("tr-TR")
            : null,
          startDateTime: startDate,
          canCancel: false, // Cancelled reservations cannot be cancelled again
          isExpired: startDate < now,
          hoursDiff: hoursDiff,
          company: booking.company,
          cancelInfo: booking.cancel || null,
          cancelReason: booking.cancel?.reason || null,
          hasAdvert: false, // Will be updated by checkAdvertForBooking
          advertId: null,   // Will be updated by checkAdvertForBooking
        };
      });

      // If it's first page, replace reservations, otherwise append
      if (page === 1) {
        setReservations(processedReservations);
      } else {
        setReservations((prev) => [...prev, ...processedReservations]);
      }

      // Update pagination info
      setTotalReservations(data.total);
      setLimit(data.limit);
      setCurrentPage(page);
      setHasMorePages(data.total > page * data.limit);

      // For cancelled tab, we only need to update the cancelled count
      // Don't reset other status counts as we're only fetching cancelled data
    } catch (error) {
      console.error("Error fetching cancelled reservations:", error);
      setError(translateMessage(error.message));
      // On error, reset to empty state
      setReservations([]);
      setTotalReservations(0);
    } finally {
      setLoading(false);
    }
  };

  // Load reservations when component mounts or authentication status changes
  useEffect(() => {
    if (isAuthenticated) {
      fetchAllReservations(1, searchTerm);
    } else {
      // Clear data when not authenticated
      setReservations([]);
      setTotalReservations(0);
      setStatusCounts({
        pending: 0,
        confirmed: 0,
        completed: 0,
        cancelled: 0,
      });
    }
  }, [isAuthenticated]);

  // Cleanup timeout on component unmount
  useEffect(() => {
    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, []);

  const tabs = [
    {
      id: "all",
      label: "Tümü",
      count:
        activeTab === "all"
          ? totalReservations
          : statusCounts.pending +
            statusCounts.confirmed +
            statusCounts.completed +
            statusCounts.cancelled,
    },
    {
      id: "pending",
      label: "Onay Bekleyen",
      count: activeTab === "pending" ? totalReservations : statusCounts.pending,
    },
    {
      id: "confirmed",
      label: "Onaylandı",
      count:
        activeTab === "confirmed" ? totalReservations : statusCounts.confirmed,
    },
    {
      id: "completed",
      label: "Tamamlandı",
      count:
        activeTab === "completed" ? totalReservations : statusCounts.completed,
    },
    {
      id: "cancelled",
      label: "İptal Edildi",
      count:
        activeTab === "cancelled" ? totalReservations : statusCounts.cancelled,
    },
  ];

  // Since we're now getting search-filtered data from backend,
  // we just display all reservations from the API response
  const filteredReservations = reservations;

  const getStatusColor = (reservation) => {
    switch (reservation.status) {
      case "pending":
        return "bg-yellow-100 text-yellow-800";
      case "confirmed":
        return "bg-blue-100 text-blue-800";
      case "completed":
        return "bg-green-100 text-green-800";
      case "cancelled":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getStatusText = (reservation) => {
    switch (reservation.status) {
      case "pending":
        return "Onay Bekleyen";
      case "confirmed":
        return "Onaylandı";
      case "completed":
        return "Tamamlandı";
      case "cancelled":
        return "İptal Edildi";
      default:
        return "Bilinmiyor";
    }
  };

  const getStatusTextForEmptyState = (status) => {
    switch (status) {
      case "pending":
        return "Onay Bekleyen";
      case "confirmed":
        return "Onaylanmış";
      case "completed":
        return "Tamamlanmış";
      case "cancelled":
        return "İptal edilmiş";
      default:
        return "Bilinmiyor";
    }
  };

  const getStatusExplanation = (reservation) => {
    // Orijinal durum ile yeni durum farklıysa açıklama göster
    if (reservation.originalStatus !== reservation.status) {
      if (
        reservation.originalStatus === "confirmed" &&
        reservation.status === "completed"
      ) {
        return "Onaylanmış rezervasyon süresi geçtiği için tamamlandı olarak işaretlendi";
      } else if (
        reservation.originalStatus === "pending" &&
        reservation.status === "cancelled"
      ) {
        return "Onay bekleyen rezervasyon süresi geçtiği için iptal edildi";
      }
    }
    return null;
  };

  // Handle tab switching with appropriate API calls
  const handleTabSwitch = (tabId) => {
    setActiveTab(tabId);
    setCurrentPage(1);
    setReservations([]); // Clear current data
    setTotalReservations(0);
    setHasMorePages(false);

    if (tabId === "all") {
      fetchAllReservations(1, searchTerm);
    } else if (tabId === "pending") {
      fetchPendingReservations(1, searchTerm);
    } else if (tabId === "confirmed") {
      fetchConfirmedReservations(1, searchTerm);
    } else if (tabId === "completed") {
      fetchCompletedReservations(1, searchTerm);
    } else if (tabId === "cancelled") {
      fetchCancelledReservations(1, searchTerm);
    } else {
      // All tabs are now implemented, this should not happen
      fetchAllReservations(1, searchTerm);
    }
  };

  // Load more reservations (pagination)
  const handleLoadMore = () => {
    if (hasMorePages && !loading) {
      if (activeTab === "all") {
        fetchAllReservations(currentPage + 1, searchTerm);
      } else if (activeTab === "pending") {
        fetchPendingReservations(currentPage + 1, searchTerm);
      } else if (activeTab === "confirmed") {
        fetchConfirmedReservations(currentPage + 1, searchTerm);
      } else if (activeTab === "completed") {
        fetchCompletedReservations(currentPage + 1, searchTerm);
      } else if (activeTab === "cancelled") {
        fetchCancelledReservations(currentPage + 1, searchTerm);
      } else {
        // All tabs are now implemented, this should not happen
        fetchAllReservations(currentPage + 1, searchTerm);
      }
    }
  };

  // Toggle inline cancellation input
  const handleCancelReservation = (reservation) => {
    if (cancellingReservationId === reservation.id) {
      // If clicking the same reservation, close the input
      setCancellingReservationId(null);
      setCancelReason("");
      setCancelLoading(false);
    } else {
      // Open input for this reservation
      setCancellingReservationId(reservation.id);
      setCancelReason("");
      setCancelLoading(false);
    }
  };

  // Close inline cancellation input
  const handleCloseCancellation = () => {
    setCancellingReservationId(null);
    setCancelReason("");
    setCancelLoading(false);
  };

  // Submit cancellation to backend
  const handleSubmitCancellation = async (reservationId) => {
    if (!cancelReason.trim()) {
      showNotification("Lütfen iptal nedenini belirtin.", "error");
      return;
    }

    setCancelLoading(true);

    try {
      const response = await fetch(
        `http://localhost:5000/api/v1/booking/refund/${reservationId}`,
        {
          method: "PATCH",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            reason: cancelReason.trim(),
          }),
        }
      );

      if (!response.ok) {
        let errorMessage = "Rezervasyon iptal edilirken bir hata oluştu.";
        if (response.status === 400) {
          const errorData = await response.json();
          if (errorData.msg === "Please provide a reason for the refund") {
            errorMessage = "Lütfen iptal nedenini belirtin.";
          } else if (
            errorData.msg === "You cannot refund a completed booking"
          ) {
            errorMessage = "Tamamlanmış rezervasyonlar iptal edilemez.";
          } else if (errorData.msg === "This booking is already cancelled") {
            errorMessage = "Bu rezervasyon zaten iptal edilmiş.";
          } else if (
            errorData.msg === "This booking is not paid, no need to refund"
          ) {
            errorMessage = "Bu rezervasyon ödemesi alınmamış, iade gerekmez.";
          } else {
            errorMessage = errorData.msg || errorMessage;
          }
        } else if (response.status === 401) {
          errorMessage = "Bu işlem için giriş yapmanız gerekir.";
        } else if (response.status === 404) {
          errorMessage = "Rezervasyon bulunamadı.";
        } else if (response.status === 500) {
          errorMessage =
            "Sunucu hatası oluştu. Lütfen daha sonra tekrar deneyin.";
        }
        throw new Error(errorMessage);
      }

      const data = await response.json();
      const updatedBooking = data.booking;

      // Update the reservation in the local state with the backend response
      setReservations((prev) =>
        prev.map((res) =>
          res.id === reservationId
            ? {
                ...res,
                status: "cancelled",
                canCancel: false,
                cancelReason:
                  updatedBooking.cancel?.reason || cancelReason.trim(),
                cancelInfo: updatedBooking.cancel || null,
                paid: false, // Backend sets paid to false when cancelled
              }
            : res
        )
      );

      // Close input and show success message
      handleCloseCancellation();
      showNotification("Rezervasyon başarıyla iptal edildi.", "success");

      // Refresh the current view to get updated data
      if (activeTab === "all") {
        fetchAllReservations(1, searchTerm);
      } else if (activeTab === "pending") {
        fetchPendingReservations(1, searchTerm);
      } else if (activeTab === "confirmed") {
        fetchConfirmedReservations(1, searchTerm);
      } else if (activeTab === "completed") {
        fetchCompletedReservations(1, searchTerm);
      } else if (activeTab === "cancelled") {
        fetchCancelledReservations(1, searchTerm);
      }
    } catch (error) {
      console.error("Error cancelling reservation:", error);
      showNotification(
        error.message || "Rezervasyon iptal edilirken bir hata oluştu.",
        "error"
      );
    } finally {
      setCancelLoading(false);
    }
  };

  // Debounced search function - only executes API call after user stops typing
  const debouncedSearch = useCallback(
    (searchTerm) => {
      setCurrentPage(1);
      setReservations([]); // Clear current data
      setTotalReservations(0);
      setHasMorePages(false);

      // Call the appropriate API based on active tab with search term
      if (activeTab === "all") {
        fetchAllReservations(1, searchTerm);
      } else if (activeTab === "pending") {
        fetchPendingReservations(1, searchTerm);
      } else if (activeTab === "confirmed") {
        fetchConfirmedReservations(1, searchTerm);
      } else if (activeTab === "completed") {
        fetchCompletedReservations(1, searchTerm);
      } else if (activeTab === "cancelled") {
        fetchCancelledReservations(1, searchTerm);
      } else {
        fetchAllReservations(1, searchTerm);
      }
    },
    [activeTab]
  );

  // Handle search input change - updates UI immediately but debounces API calls
  const handleSearch = (newSearchTerm) => {
    setSearchTerm(newSearchTerm); // Update UI immediately

    // Clear existing timeout
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    // Set new timeout for API call (300ms delay)
    searchTimeoutRef.current = setTimeout(() => {
      debouncedSearch(newSearchTerm);
    }, 300);
  };

  const getSurfaceTypeText = (surfaceType) => {
    switch (surfaceType) {
      case "artificial_turf":
        return "Sentetik Çim";
      case "natural_grass":
        return "Doğal Çim";
      case "concrete":
        return "Beton";
      default:
        return surfaceType;
    }
  };

  const getPaymentMethodText = (method) => {
    switch (method) {
      case "wallet":
        return "Cüzdan";
      case "card":
        return "Kart";
      case "cash":
        return "Nakit";
      default:
        return method;
    }
  };

  // Handle creating ad from reservation
  const handleCreateAdFromReservation = (reservation) => {
    // Extract player count from players string (e.g., "11v11" -> 22, or direct number)
    let totalPlayers = 22; // Default for 11v11
    if (typeof reservation.players === 'string') {
      // If format is like "11v11", extract and sum
      const playersMatch = reservation.players.match(/(\d+)v(\d+)/);
      if (playersMatch) {
        totalPlayers = parseInt(playersMatch[1]) + parseInt(playersMatch[2]);
      } else {
        // If it's just a number string
        const numberMatch = reservation.players.match(/(\d+)/);
        if (numberMatch) {
          totalPlayers = parseInt(numberMatch[1]);
        }
      }
    } else if (typeof reservation.players === 'number') {
      totalPlayers = reservation.players;
    }

    // Calculate price per person
    const pricePerPerson = Math.round(reservation.price / totalPlayers);

    // Prepare data for CreateAdModal
    const adData = {
      title: `${reservation.pitchName} Maçı`,
      date: reservation.startDateTime.toISOString().split("T")[0], // YYYY-MM-DD format
      time: `${reservation.startDateTime.getHours()}-${
        reservation.startDateTime.getHours() + 1
      }`, // Format: "14-15"
      location: reservation.pitchName,
      pitchName: reservation.pitchName,
      capacity: `${reservation.players}v${reservation.players}`,
      price: pricePerPerson,
      duration: "1 saat",
    };

    console.log('CreateAd data:', {
      totalReservationPrice: reservation.price,
      playersString: reservation.players,
      calculatedTotalPlayers: totalPlayers,
      pricePerPerson: pricePerPerson
    });

    // Store data in localStorage to pass to matches page
    localStorage.setItem("createListingData", JSON.stringify(adData));

    // Navigate to matches page with create action
    navigate("/matches?action=create");
  };

  // Check if booking has an advert by booking ID
  const checkAdvertForBooking = async (bookingId) => {
    try {
      console.log(`Checking advert for booking ID: ${bookingId}`);
      
      // Try method 1: Specific endpoint
      const response = await fetch(`/api/v1/advert/booking/${bookingId}`, {
        method: 'GET',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        }
      });

      console.log(`Response status: ${response.status}`);

      if (response.ok) {
        const data = await response.json();
        console.log('Advert found for booking:', data);
        return {
          hasAdvert: true,
          advertId: data.advertId || data._id || data.id
        };
      } else if (response.status === 404) {
        console.log('No advert found for booking (404)');
        return {
          hasAdvert: false,
          advertId: null
        };
      } else {
        console.log('API error, trying alternative method...');
        
        // Try method 2: Get all user adverts and filter
        const allAdvertsResponse = await fetch('/api/v1/advert/user', {
          method: 'GET',
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json',
          }
        });

        if (allAdvertsResponse.ok) {
          const allAdvertsData = await allAdvertsResponse.json();
          console.log('All user adverts:', allAdvertsData);
          
          // Find advert with matching booking ID
          const matchingAdvert = allAdvertsData.adverts?.find(advert => 
            advert.bookingId === bookingId || advert.booking === bookingId
          );

          if (matchingAdvert) {
            console.log('Found matching advert:', matchingAdvert);
            return {
              hasAdvert: true,
              advertId: matchingAdvert._id || matchingAdvert.id
            };
          }
        }
      }
      
      console.log('No advert found for booking');
      return {
        hasAdvert: false,
        advertId: null
      };
    } catch (error) {
      console.error('Error checking advert for booking:', error);
      return {
        hasAdvert: false,
        advertId: null
      };
    }
  };

  // Update reservations with advert status
  const updateReservationsWithAdvertStatus = async (reservations) => {
    const updatedReservations = await Promise.all(
      reservations.map(async (reservation) => {
        if (reservation.status === "pending" || reservation.status === "confirmed") {
          const advertStatus = await checkAdvertForBooking(reservation.id);
          return {
            ...reservation,
            hasAdvert: advertStatus.hasAdvert,
            advertId: advertStatus.advertId,
          };
        }
        return reservation;
      })
    );
    return updatedReservations;
  };

  // Handle removing ad from reservation
  const handleRemoveAdFromReservation = async (reservation) => {
    if (!reservation.advertId) {
      showNotification("İlan ID'si bulunamadı.", "error");
      return;
    }

    try {
      const response = await fetch(`/api/v1/advert/${reservation.advertId}`, {
        method: "DELETE",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.msg || "İlan silinirken hata oluştu");
      }

      // Refresh reservations to update the hasAdvert status
      const currentTab = activeTab;
      if (currentTab === "all") {
        fetchAllReservations(1, searchTerm);
      } else if (currentTab === "pending") {
        fetchPendingReservations(1, searchTerm);
      } else if (currentTab === "confirmed") {
        fetchConfirmedReservations(1, searchTerm);
      } else if (currentTab === "completed") {
        fetchCompletedReservations(1, searchTerm);
      } else if (currentTab === "cancelled") {
        fetchCancelledReservations(1, searchTerm);
      }

      showNotification("İlan başarıyla kaldırıldı.", "success");
    } catch (error) {
      console.error("Error removing ad:", error);
      showNotification(translateMessage(error.message), "error");
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-3 sm:p-4 md:p-6">
      <h2 className="text-lg sm:text-xl text-center font-bold text-gray-900 mb-2 sm:mb-0">
        Rezervasyonlarım
      </h2>
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-4 sm:mb-6">
        <div className="text-xs sm:text-sm text-gray-500 flex justify-end">
          Toplam {totalReservations} rezervasyon
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
          <div className="flex items-center">
            <svg
              className="w-5 h-5 text-red-600 mr-2"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 15.5c-.77.833.192 2.5 1.732 2.5z"
              />
            </svg>
            <span className="text-red-700 font-medium">Hata:</span>
          </div>
          <p className="text-red-600 mt-1">{error}</p>
          <button
            onClick={() => {
              if (activeTab === "all") {
                fetchAllReservations(1, searchTerm);
              } else if (activeTab === "pending") {
                fetchPendingReservations(1, searchTerm);
              } else if (activeTab === "confirmed") {
                fetchConfirmedReservations(1, searchTerm);
              } else if (activeTab === "completed") {
                fetchCompletedReservations(1, searchTerm);
              } else if (activeTab === "cancelled") {
                fetchCancelledReservations(1, searchTerm);
              } else {
                fetchAllReservations(1, searchTerm);
              }
            }}
            className="mt-2 text-sm text-red-600 hover:text-red-800 hover:cursor-pointer underline"
          >
            Tekrar dene
          </button>
        </div>
      )}

      {/* Search */}
      <div className="mb-4 sm:mb-6">
        <div className="relative">
          <input
            type="text"
            placeholder="Saha adı veya konum ara..."
            value={searchTerm}
            onChange={(e) => handleSearch(e.target.value)}
            className="w-full pl-8 sm:pl-10 pr-4 py-2 text-sm sm:text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
          />
          <svg
            className="absolute left-2 sm:left-3 top-2 sm:top-2.5 h-4 w-4 sm:h-5 sm:w-5 text-gray-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap justify-center gap-1 mb-4 sm:mb-6 bg-gray-100 p-1 rounded-lg">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => handleTabSwitch(tab.id)}
            className={`flex items-center justify-center space-x-1 sm:space-x-2 px-2 sm:px-4 py-1.5 sm:py-2 rounded-md text-xs sm:text-sm font-medium transition-colors whitespace-nowrap hover:cursor-pointer ${
              activeTab === tab.id
                ? "bg-white text-green-600 shadow-sm"
                : "text-gray-600 hover:text-gray-900"
            }`}
          >
            <span>{tab.label}</span>
            <span
              className={`px-1.5 sm:px-2 py-0.5 rounded-full text-xs ${
                activeTab === tab.id
                  ? "bg-green-100 text-green-600"
                  : "bg-gray-200 text-gray-600"
              }`}
            >
              {tab.count}
            </span>
          </button>
        ))}
      </div>

      {/* Loading Display */}
      {loading && reservations.length === 0 && (
        <div className="mb-6 text-center py-8">
          <div className="inline-flex items-center">
            <svg
              className="animate-spin h-5 w-5 text-green-600 mr-2"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              ></circle>
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              ></path>
            </svg>
            <span className="text-gray-600">Rezervasyonlar yükleniyor...</span>
          </div>
        </div>
      )}

      {/* Reservations List */}
      <div className="space-y-3 sm:space-y-4">
        {filteredReservations.map((reservation) => (
          <div
            key={reservation.id}
            className="border-2 border-gray-200 bg-gray-100 rounded-lg p-4 sm:p-4 md:p-5 lg:p-6 shadow-sm hover:shadow-lg transition-shadow duration-300"
          >
            <div className="mb-4 sm:mb-3">
              <div className="flex flex-col lg:flex-row lg:justify-between lg:items-start mb-3 sm:mb-2">
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-900 text-base sm:text-lg">
                    {reservation.pitchName}
                  </h3>
                  <hr className="border-gray-300 mt-1 mb-2" />
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:space-x-4 space-y-1 sm:space-y-0 text-sm sm:text-base font-semibold text-gray-700 italic">
                    <div className="flex items-center space-x-1">
                      <svg
                        className="w-3 h-3 sm:w-4 sm:h-4 text-blue-600"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                        />
                      </svg>
                      <span>{reservation.date}</span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <svg
                        className="w-3 h-3 sm:w-4 sm:h-4 text-green-600"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                        />
                      </svg>
                      <span>{reservation.time}</span>
                    </div>
                  </div>
                </div>
                <div className="flex flex-col lg:items-end space-y-2 mt-3 lg:mt-0">
                  <span
                    className={`px-2 sm:px-3 py-1 rounded-full text-xs font-medium self-start lg:self-end ${getStatusColor(
                      reservation
                    )}`}
                  >
                    {getStatusText(reservation)}
                  </span>
                  {getStatusExplanation(reservation) && (
                    <span className="text-xs text-blue-600 bg-blue-50 px-2 py-1 rounded max-w-full lg:max-w-48 lg:text-right">
                      {getStatusExplanation(reservation)}
                    </span>
                  )}
                  {reservation.status === "confirmed" &&
                    reservation.hoursDiff <= 48 &&
                    reservation.hoursDiff > 0 && (
                      <span className="text-xs text-orange-600 bg-orange-50 px-2 py-1 rounded">
                        48 saat kuralı: İptal edilemez
                      </span>
                    )}
                  {!reservation.paid && (
                    <span className="text-xs text-red-600 bg-red-50 px-2 py-1 rounded">
                      Ödeme Bekleniyor
                    </span>
                  )}
                  {reservation.cancelReason && (
                    <div className="mt-2 p-2 sm:p-3 bg-red-50 rounded-lg border-l-4 border-red-400 w-full lg:max-w-64">
                      <p className="text-xs sm:text-sm text-red-700">
                        <span className="font-medium">İptal Nedeni:</span>{" "}
                        {reservation.cancelReason}
                      </p>
                      {/* Display who cancelled the reservation */}
                      {(reservation.cancel?.by || reservation.refunded?.by) && (
                        <p className="text-xs sm:text-sm text-red-600 mt-1">
                          <span className="font-medium">İptal Eden:</span>{" "}
                          {reservation.cancel?.by?.name ||
                            reservation.refunded?.by?.name}
                        </p>
                      )}
                    </div>
                  )}

                  {/* Refund information display for completed reservations with refunds */}
                  {reservation.status === "completed" &&
                    reservation.refunded?.by && (
                      <div className="mt-2 p-2 sm:p-3 bg-blue-50 rounded-lg border-l-4 border-blue-400 w-full lg:max-w-64">
                        <p className="text-xs sm:text-sm text-blue-700">
                          <span className="font-medium">İade Yapıldı</span>
                          {reservation.refunded.reason && (
                            <>
                              <span> - </span>
                              <span className="font-normal">
                                {reservation.refunded.reason}
                              </span>
                            </>
                          )}
                        </p>
                        <p className="text-xs sm:text-sm text-blue-600 mt-1">
                          <span className="font-medium">İade Eden:</span>{" "}
                          {reservation.refunded.by.name}
                        </p>
                      </div>
                    )}
                </div>
              </div>
            </div>

            {/* Para ve oyuncu bilgisi */}
            <div className="mb-3 sm:mb-3 flex flex-col space-y-3 sm:space-y-2">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:space-x-4 space-y-2 sm:space-y-0">
                <div className="flex items-center space-x-2">
                  <img
                    src="https://upload.wikimedia.org/wikipedia/commons/a/af/Turkish_lira_symbol_black.svg"
                    alt="Turkish Lira"
                    className="w-3 h-3 sm:w-4 sm:h-4 text-green-600"
                  />
                  <span className="font-semibold text-green-600 text-sm sm:text-base">
                    {reservation.price} {reservation.currency}
                  </span>
                  {!reservation.paid && (
                    <span className="text-xs text-red-600">(Ödenmedi)</span>
                  )}
                </div>

                <div className="flex items-center space-x-2">
                  <svg
                    className="w-3 h-3 sm:w-4 sm:h-4 text-gray-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                    />
                  </svg>
                  <span className="text-xs sm:text-sm text-gray-600">
                    {reservation.players} oyuncu
                  </span>
                </div>
              </div>

              {/* Not kısmı tek satırda */}

              {reservation.notes && (
                <div className="mb-3 p-2 sm:mb-3 mx-0  p-3 sm:p-2 bg-blue-50 rounded-lg border-l-4 border-blue-400">
                  <p className="text-xs sm:text-sm text-blue-700 truncate">
                    <span className="font-medium">Saha Sahibine Not:</span>{" "}
                    {reservation.notes}
                  </p>
                </div>
              )}

              {/* Butonlar sağ tarafta */}
              <div className="flex flex-wrap sm:flex-nowrap gap-2 sm:space-x-2 justify-start sm:justify-end">
                <button
                  onClick={() =>
                    navigate(`/pitch-detail/${reservation.pitchId}`)
                  }
                  className="px-3 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm text-blue-600 border border-blue-600 rounded-lg hover:bg-blue-50 hover:cursor-pointer transition-colors flex-1 sm:flex-none"
                >
                  Saha Detayı
                </button>

                {reservation.canCancel && (
                  <button
                    onClick={() => handleCancelReservation(reservation)}
                    disabled={loading}
                    className="px-3 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm text-red-600 border border-red-600 rounded-lg hover:bg-red-50 hover:cursor-pointer transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex-1 sm:flex-none"
                  >
                    İptal Et
                  </button>
                )}

                {reservation.status === "completed" && (
                  <button
                    onClick={() =>
                      window.open(
                        `/pitch-detail/${reservation.pitchId}`,
                        "_blank"
                      )
                    }
                    className="px-3 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm text-green-600 border border-green-600 rounded-lg hover:bg-green-50 hover:cursor-pointer transition-colors flex-1 sm:flex-none"
                  >
                    Tekrar Rezerve Et
                  </button>
                )}

                {(reservation.status === "pending" ||
                  reservation.status === "confirmed") && (
                  !reservation.hasAdvert ? (
                    <button
                      onClick={() => handleCreateAdFromReservation(reservation)}
                      className="px-3 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm text-green-600 border border-green-600 rounded-lg hover:bg-green-50 hover:cursor-pointer transition-colors flex-1 sm:flex-none"
                    >
                      İlan Koy
                    </button>
                  ) : (
                    <button
                      onClick={() => handleRemoveAdFromReservation(reservation)}
                      className="px-3 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm text-red-600 border border-red-600 rounded-lg hover:bg-red-50 hover:cursor-pointer transition-colors flex-1 sm:flex-none"
                    >
                      İlandan Kaldır
                    </button>
                  )
                )}

                {/* Fatura butonu - sadece ödenmiş rezervasyonlarda */}
                {reservation.paid && (
                  <button
                    onClick={() =>
                      window.open(`/invoice/${reservation.id}`, "_blank")
                    }
                    className="px-3 sm:px-3 py-1 text-xs text-gray-600 border border-gray-300 rounded hover:bg-gray-50 hover:cursor-pointer transition-colors flex-1 sm:flex-none"
                  >
                    📄 Faturam
                  </button>
                )}
              </div>
            </div>

            {/* Inline Cancellation Input */}
            {cancellingReservationId === reservation.id && (
              <div className="mt-3 sm:mt-4 p-3 sm:p-4 bg-red-50 border border-red-200 rounded-lg animate-fadeIn">
                <h4 className="text-xs sm:text-sm font-semibold text-red-800 mb-2 sm:mb-3">
                  Rezervasyon İptali - {reservation.pitchName}
                </h4>

                <div className="mb-3">
                  <label
                    htmlFor={`cancelReason-${reservation.id}`}
                    className="block text-xs sm:text-sm font-medium text-red-700 mb-2"
                  >
                    İptal Nedeni <span className="text-red-600">*</span>
                  </label>
                  <textarea
                    id={`cancelReason-${reservation.id}`}
                    value={cancelReason}
                    onChange={(e) => setCancelReason(e.target.value)}
                    placeholder="Lütfen rezervasyonunuzu neden iptal ettiğinizi belirtin..."
                    className="w-full px-2 sm:px-3 py-2 border border-red-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent resize-none text-xs sm:text-sm"
                    rows={3}
                    maxLength={500}
                    disabled={cancelLoading}
                  />
                  <p className="text-xs text-red-600 mt-1">
                    {cancelReason.length}/500 karakter
                  </p>
                </div>

                <div className="flex flex-col sm:flex-row gap-2 sm:space-x-2 sm:justify-end">
                  <button
                    onClick={handleCloseCancellation}
                    disabled={cancelLoading}
                    className="px-3 py-1.5 text-xs sm:text-sm text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 hover:cursor-pointer transition-colors disabled:opacity-50 disabled:cursor-not-allowed order-2 sm:order-1"
                  >
                    Vazgeç
                  </button>
                  <button
                    onClick={() => handleSubmitCancellation(reservation.id)}
                    disabled={cancelLoading || !cancelReason.trim()}
                    className="px-3 py-1.5 text-xs sm:text-sm text-white bg-red-600 rounded-lg hover:bg-red-700 hover:cursor-pointer transition-colors disabled:opacity-50 disabled:cursor-not-allowed order-1 sm:order-2"
                  >
                    {cancelLoading ? (
                      <div className="flex items-center justify-center">
                        <svg
                          className="animate-spin h-3 w-3 mr-1"
                          fill="none"
                          viewBox="0 0 24 24"
                        >
                          <circle
                            className="opacity-25"
                            cx="12"
                            cy="12"
                            r="10"
                            stroke="currentColor"
                            strokeWidth="4"
                          ></circle>
                          <path
                            className="opacity-75"
                            fill="currentColor"
                            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                          ></path>
                        </svg>
                        İptal Ediliyor...
                      </div>
                    ) : (
                      "İptal Et"
                    )}
                  </button>
                </div>
              </div>
            )}

            {/* Saha İletişim */}
            {reservation.contact.phone && (
              <div className="mt-3 pt-3 border-t border-gray-100">
                <div className="flex flex-col sm:flex-row sm:items-center space-y-1 sm:space-y-0 sm:space-x-2 text-xs sm:text-sm text-gray-600">
                  <div className="flex items-center space-x-2">
                    <svg
                      className="w-3 h-3 sm:w-4 sm:h-4"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"
                      />
                    </svg>
                    <span className="font-medium">Saha İletişim:</span>
                  </div>
                  <a
                    href={`tel:${reservation.contact.phone}`}
                    className="text-green-600 hover:text-green-700 font-medium transition-colors"
                  >
                    {reservation.contact.phone}
                  </a>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Load More Button */}
      {hasMorePages && filteredReservations.length > 0 && (
        <div className="mt-4 sm:mt-6 text-center">
          <button
            onClick={handleLoadMore}
            disabled={loading}
            className="w-full sm:w-auto px-4 sm:px-6 py-2 sm:py-3 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 hover:cursor-pointer focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm sm:text-base"
            style={{
              backgroundColor: "rgb(0, 128, 0)",
              borderRadius: "6px",
            }}
            onMouseEnter={(e) => {
              if (!loading) e.target.style.backgroundColor = "rgb(0, 100, 0)";
            }}
            onMouseLeave={(e) => {
              if (!loading) e.target.style.backgroundColor = "rgb(0, 128, 0)";
            }}
          >
            {loading ? (
              <div className="flex items-center justify-center">
                <svg
                  className="animate-spin h-3 w-3 sm:h-4 sm:w-4 mr-2"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  ></circle>
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  ></path>
                </svg>
                Yükleniyor...
              </div>
            ) : (
              `Daha Fazla Göster (${
                totalReservations - reservations.length
              } kaldı)`
            )}
          </button>
        </div>
      )}

      {filteredReservations.length === 0 && !loading && (
        <div className="text-center py-6 sm:py-8">
          <svg
            className="mx-auto h-10 w-10 sm:h-12 sm:w-12 text-gray-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
            />
          </svg>
          <h3 className="mt-2 text-sm font-medium text-gray-900">
            Rezervasyon bulunamadı
          </h3>
          <p className="mt-1 text-xs sm:text-sm text-gray-500">
            {activeTab === "all"
              ? ""
              : `${getStatusTextForEmptyState(
                  activeTab
                )} rezervasyon bulunamadı.`}
          </p>
        </div>
      )}

      {/* Notification */}
      <Notification
        message={notification.message}
        type={notification.type}
        isVisible={notification.isVisible}
        onClose={hideNotification}
      />
    </div>
  );
}

export default MyReservations;
