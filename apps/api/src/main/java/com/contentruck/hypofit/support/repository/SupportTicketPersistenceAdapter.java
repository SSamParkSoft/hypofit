package com.contentruck.hypofit.support.repository;

import com.contentruck.hypofit.support.entity.SupportTicketEntity;
import com.contentruck.hypofit.support.entity.SupportTicketEventEntity;
import com.contentruck.hypofit.support.entity.SupportUserAccountEntity;

import com.contentruck.hypofit.support.service.SupportTicketCreateCommand;
import com.contentruck.hypofit.support.service.SupportTicketRepository;
import com.contentruck.hypofit.support.service.SupportTicketUpdateCommand;
import com.contentruck.hypofit.support.service.SupportActorAccount;
import com.contentruck.hypofit.support.service.SupportTicketEventRecord;
import com.contentruck.hypofit.support.service.SupportTicketReadModel;
import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import org.springframework.stereotype.Repository;

@Repository
public class SupportTicketPersistenceAdapter implements SupportTicketRepository {

    @PersistenceContext
    private EntityManager entityManager;

    @Override
    public Optional<SupportActorAccount> findUserAccount(UUID userId) {
        SupportUserAccountEntity entity = entityManager.find(SupportUserAccountEntity.class, userId);
        if (entity == null) {
            return Optional.empty();
        }
        return Optional.of(new SupportActorAccount(
                entity.getId(),
                entity.getEmail(),
                entity.getDeletedAt() != null,
                entity.getDeactivatedAt() != null
        ));
    }

    @Override
    public SupportTicketReadModel createTicket(UUID userId, SupportTicketCreateCommand command) {
        SupportTicketEntity ticket = new SupportTicketEntity();
        ticket.setUserId(userId);
        ticket.setKind(command.kind());
        ticket.setCategory(command.category());
        ticket.setSubject(command.subject());
        ticket.setBody(command.body());
        ticket.setContactEmail(command.contactEmail());
        ticket.setTargetType(command.targetType());
        ticket.setTargetId(command.targetId());
        ticket.setStatus("open");
        ticket.setMetadata(command.metadata());
        entityManager.persist(ticket);
        entityManager.flush();

        SupportTicketEventEntity event = new SupportTicketEventEntity();
        event.setTicketId(ticket.getId());
        event.setActorUserId(userId);
        event.setActorType("user");
        event.setEventType("created");
        event.setToStatus(ticket.getStatus());
        event.setMetadata(Map.of("kind", ticket.getKind(), "category", ticket.getCategory()));
        entityManager.persist(event);
        entityManager.flush();
        return toReadModel(ticket);
    }

    @Override
    public List<SupportTicketReadModel> listTickets(UUID userId, String kind) {
        StringBuilder jpql = new StringBuilder("""
                select t
                from SupportTicketEntity t
                where t.userId = :userId
                  and t.deletedByUserAt is null
                """);
        if (kind != null) {
            jpql.append(" and t.kind = :kind");
        }
        jpql.append(" order by t.createdAt desc");

        var query = entityManager.createQuery(jpql.toString(), SupportTicketEntity.class)
                .setParameter("userId", userId);
        if (kind != null) {
            query.setParameter("kind", kind);
        }
        return query.getResultList().stream()
                .map(this::toReadModel)
                .toList();
    }

    @Override
    public Optional<SupportTicketReadModel> findTicketForUser(UUID ticketId, UUID userId) {
        List<SupportTicketEntity> results = entityManager.createQuery("""
                        select t
                        from SupportTicketEntity t
                        where t.id = :ticketId
                          and t.userId = :userId
                          and t.deletedByUserAt is null
                        """, SupportTicketEntity.class)
                .setParameter("ticketId", ticketId)
                .setParameter("userId", userId)
                .getResultList();
        if (results.isEmpty()) {
            return Optional.empty();
        }
        return Optional.of(toReadModel(results.getFirst()));
    }

    @Override
    public SupportTicketReadModel updateTicket(UUID ticketId, UUID userId, SupportTicketUpdateCommand command) {
        SupportTicketEntity ticket = entityManager.createQuery("""
                        select t
                        from SupportTicketEntity t
                        where t.id = :ticketId
                          and t.userId = :userId
                          and t.deletedByUserAt is null
                        """, SupportTicketEntity.class)
                .setParameter("ticketId", ticketId)
                .setParameter("userId", userId)
                .getSingleResult();

        if (command.providedFields().contains("category") && command.category() != null) {
            ticket.setCategory(command.category());
        }
        if (command.providedFields().contains("subject")) {
            ticket.setSubject(command.subject());
        }
        if (command.providedFields().contains("body") && command.body() != null) {
            ticket.setBody(command.body());
        }
        if (command.providedFields().contains("contact_email") && command.contactEmail() != null) {
            ticket.setContactEmail(command.contactEmail());
        }

        SupportTicketEventEntity event = new SupportTicketEventEntity();
        event.setTicketId(ticket.getId());
        event.setActorUserId(ticket.getUserId());
        event.setActorType("user");
        event.setEventType("edited");
        event.setToStatus(ticket.getStatus());
        event.setMetadata(Map.of("fields", command.providedFields().stream().sorted().toList()));
        entityManager.persist(event);
        entityManager.flush();
        return toReadModel(ticket);
    }

    @Override
    public void deleteTicket(UUID ticketId, UUID userId) {
        SupportTicketEntity ticket = entityManager.createQuery("""
                        select t
                        from SupportTicketEntity t
                        where t.id = :ticketId
                          and t.userId = :userId
                          and t.deletedByUserAt is null
                        """, SupportTicketEntity.class)
                .setParameter("ticketId", ticketId)
                .setParameter("userId", userId)
                .getSingleResult();

        OffsetDateTime deletedAt = OffsetDateTime.now(ZoneOffset.UTC);
        ticket.setDeletedByUserAt(deletedAt);

        SupportTicketEventEntity event = new SupportTicketEventEntity();
        event.setTicketId(ticket.getId());
        event.setActorUserId(ticket.getUserId());
        event.setActorType("user");
        event.setEventType("deleted_by_user");
        event.setFromStatus(ticket.getStatus());
        event.setMetadata(Map.of("deleted_by_user_at", deletedAt.toString()));
        entityManager.persist(event);
        entityManager.flush();
    }

    @Override
    public Map<UUID, List<SupportTicketEventRecord>> listTicketEvents(List<UUID> ticketIds) {
        if (ticketIds == null || ticketIds.isEmpty()) {
            return Map.of();
        }
        List<SupportTicketEventEntity> events = entityManager.createQuery("""
                        select e
                        from SupportTicketEventEntity e
                        where e.ticketId in :ticketIds
                        order by e.createdAt asc
                        """, SupportTicketEventEntity.class)
                .setParameter("ticketIds", ticketIds)
                .getResultList();
        Map<UUID, List<SupportTicketEventRecord>> grouped = new LinkedHashMap<>();
        for (SupportTicketEventEntity event : events) {
            grouped.computeIfAbsent(event.getTicketId(), ignored -> new java.util.ArrayList<>())
                    .add(toEventRecord(event));
        }
        return grouped;
    }

    private SupportTicketReadModel toReadModel(SupportTicketEntity entity) {
        return new SupportTicketReadModel(
                entity.getId(),
                entity.getUserId(),
                entity.getKind(),
                entity.getCategory(),
                entity.getSubject(),
                entity.getBody(),
                entity.getContactEmail(),
                entity.getTargetType(),
                entity.getTargetId(),
                entity.getStatus(),
                entity.getDeletedByUserAt(),
                entity.getMetadata(),
                entity.getCreatedAt(),
                entity.getUpdatedAt(),
                List.of()
        );
    }

    private SupportTicketEventRecord toEventRecord(SupportTicketEventEntity entity) {
        return new SupportTicketEventRecord(
                entity.getId(),
                entity.getTicketId(),
                entity.getActorUserId(),
                entity.getActorType(),
                entity.getEventType(),
                entity.getFromStatus(),
                entity.getToStatus(),
                entity.getMessage(),
                entity.getMetadata(),
                entity.getCreatedAt()
        );
    }
}
