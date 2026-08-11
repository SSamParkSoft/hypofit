package com.contentruck.hypofit.support.application;

import com.contentruck.hypofit.support.domain.SupportActorAccount;
import com.contentruck.hypofit.support.domain.SupportTicketEventRecord;
import com.contentruck.hypofit.support.domain.SupportTicketReadModel;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

public interface SupportTicketRepository {

    Optional<SupportActorAccount> findUserAccount(UUID userId);

    SupportTicketReadModel createTicket(UUID userId, SupportTicketCreateCommand command);

    List<SupportTicketReadModel> listTickets(UUID userId, String kind);

    Optional<SupportTicketReadModel> findTicketForUser(UUID ticketId, UUID userId);

    SupportTicketReadModel updateTicket(UUID ticketId, UUID userId, SupportTicketUpdateCommand command);

    void deleteTicket(UUID ticketId, UUID userId);

    Map<UUID, List<SupportTicketEventRecord>> listTicketEvents(List<UUID> ticketIds);
}
